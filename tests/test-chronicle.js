// F4 — Typed & color-coded Chronicle: kind field, sanitize, migrate, banner queue.
const fs = require('fs'), vm = require('vm'), path = require('path');
const root = require('path').join(__dirname, '..');

const ctx = {
  console, Math, Date, JSON, parseInt, Number, Array, Object, String,
  document: { getElementById: () => ({ style: {}, scrollTop: 0, scrollHeight: 0, clientHeight: 0 }), createElement: () => ({}), addEventListener() {} },
  localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
  setInterval: () => 0, setTimeout: () => 0, addEventListener() {},
  btoa: (s) => Buffer.from(s, 'binary').toString('base64'),
  atob: (s) => Buffer.from(s, 'base64').toString('binary'),
  encodeURIComponent, decodeURIComponent, escape, unescape,
};
ctx.window = ctx; vm.createContext(ctx);
for (const f of ['js/data.js', 'js/story.js', 'js/game.js'])
  vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f });

const GG = ctx.GG, Game = GG.Game;
let pass = 0, fail = 0;
const ok = (c, m) => { c ? pass++ : fail++; if (!c) console.log('  FAIL:', m); };

// --- chronicle() stores kind correctly ---
const s = Game.fresh(0.3);
const before = s.chronicle.length;

Game.chronicle(s, 'an oracle speaks', 'oracle');
ok(s.chronicle[s.chronicle.length - 1].kind === 'oracle', 'explicit kind=oracle stored');

Game.chronicle(s, 'a world event', 'world');
ok(s.chronicle[s.chronicle.length - 1].kind === 'world', 'explicit kind=world stored');

Game.chronicle(s, 'a default entry');
ok(s.chronicle[s.chronicle.length - 1].kind === 'world', 'missing kind defaults to world');

Game.chronicle(s, 'bad kind', 'injected');
ok(s.chronicle[s.chronicle.length - 1].kind === 'world', 'unknown kind coerced to world at chronicle()');

Game.chronicle(s, 'build', 'build');
ok(s.chronicle[s.chronicle.length - 1].kind === 'build', 'kind=build stored');

Game.chronicle(s, 'combat', 'combat');
ok(s.chronicle[s.chronicle.length - 1].kind === 'combat', 'kind=combat stored');

Game.chronicle(s, 'a portent', 'portent');
ok(s.chronicle[s.chronicle.length - 1].kind === 'portent', 'kind=portent stored');

Game.chronicle(s, 'a milestone', 'milestone');
ok(s.chronicle[s.chronicle.length - 1].kind === 'milestone', 'kind=milestone stored');

// --- saga entries push to pendingBanners ---
const bannersBefore = Game.drainBanners().length; // drain whatever is there
Game.chronicle(s, 'the chapter dawns', 'saga');
const drained = Game.drainBanners();
ok(drained.length === 1, 'saga chronicle entry pushes exactly one banner');
ok(drained[0] === 'the chapter dawns', 'saga banner text matches the chronicle message');

// non-saga entries do NOT push banners
Game.drainBanners(); // clear
Game.chronicle(s, 'world stuff', 'world');
Game.chronicle(s, 'an oracle', 'oracle');
ok(Game.drainBanners().length === 0, 'non-saga kinds do not push banners');

// --- sanitizeState coerces kind ---
const raw = Game.fresh(0.3);
// inject a bad kind directly into the chronicle array (bypassing chronicle())
raw.chronicle.push({ t: Date.now(), msg: 'tampered', kind: '__proto__' });
raw.chronicle.push({ t: Date.now(), msg: 'also bad', kind: 'xss<script>' });
raw.chronicle.push({ t: Date.now(), msg: 'no kind at all' });

const code = Game.exportCode(raw);
const loaded = Game.importCode(code);
ok(loaded !== null, 'save with bad kinds can be imported');
const injected = loaded.chronicle.filter((c) => c.msg === 'tampered' || c.msg === 'also bad');
ok(injected.every((c) => c.kind === 'world'), 'bad kinds sanitized to world on import');
const nokind = loaded.chronicle.find((c) => c.msg === 'no kind at all');
ok(nokind && nokind.kind === 'world', 'missing kind sanitized to world on import');

// --- legacy entries (pre-F4 saves, saved as {t, msg} without kind) ---
const legacy = Game.fresh(0.3);
// simulate a pre-F4 entry: object with t and msg but no kind
legacy.chronicle.push({ t: Date.now(), msg: 'old entry without kind' });
const legacyCode = Game.exportCode(legacy);
const legacyLoaded = Game.importCode(legacyCode);
const legacyEntry = legacyLoaded.chronicle.find((c) => c.msg === 'old entry without kind');
ok(legacyEntry && legacyEntry.kind === 'world', 'legacy entries (no kind) migrate to world');

// --- chronCount still increments correctly ---
const s2 = Game.fresh(0.3);
const c0 = s2.chronCount || 0;
Game.chronicle(s2, 'first', 'world');
Game.chronicle(s2, 'second', 'oracle');
Game.chronicle(s2, 'third', 'saga');
Game.drainBanners(); // clean up
ok((s2.chronCount || 0) === c0 + 3, 'chronCount increments for all kinds');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
