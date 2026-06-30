// E3 — Hold (grip) + succession
const fs = require('fs'), vm = require('vm'), path = require('path');
const root = path.join(__dirname, '..');
const ctx = {
  console, Math, Date, JSON, parseInt, Number, Array, Object, String, isFinite,
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
const near = (a, b) => Math.abs(a - b) < 1e-9;

// --- fresh state has heir=null, resentment=0 ---
const s = Game.fresh(0.3);
ok(s.heir === null, 'fresh state: heir is null');
ok(s.resentment === 0, 'fresh state: resentment is 0');

// --- holdScore is derived from stats + renown - resentment ---
ok(Game.holdScore(s) === 0, 'fresh hold is 0 (no cruelty/openness/renown)');
s.stats.cruelty = 100; // contrib: min(50, 100*0.5) = 50
ok(Game.holdScore(s) === 50, 'cruelty contributes (capped at 50)');
s.stats.openness = 80; // contrib: min(25, 80*0.25) = 20
ok(Game.holdScore(s) === 70, 'openness contributes (capped at 25)');
s.renown = 100; // contrib: min(15, 100*0.15) = 15
ok(Game.holdScore(s) === 85, 'renown contributes (capped at 15)');
s.resentment = 30;
ok(Game.holdScore(s) === 55, 'resentment erodes hold');
s.resentment = 0; s.stats = { cruelty: 0, openness: 0, wanderlust: 0, greed: 0 }; s.renown = 0;

// --- holdTier labels ---
const ht = Game.fresh(0.3);
ok(Game.holdTier(ht) === 'Crumbling', 'hold=0 → Crumbling');
ht.stats.cruelty = 50; // hold = 25
ok(Game.holdTier(ht) === 'Tenuous', 'hold=25 → Tenuous');
ht.stats.cruelty = 100; // hold = 50
ok(Game.holdTier(ht) === 'Steady', 'hold=50 → Steady');
ht.stats.cruelty = 200; // hold capped at 50 + others = 50
ht.stats.openness = 120; // +25 cap = 75
ok(Game.holdTier(ht) === 'Iron Grip', 'hold≥70 → Iron Grip');

// --- nameHeir / clearHeir ---
const sh = Game.fresh(0.3);
// inject a notable manually
sh.notables = [{ id: 5, name: 'Grunk', role: 'the Raider', trait: 'bold', age: 200, life: 1200, titleTier: 0 }];
sh.notableSeq = 5;
Game.nameHeir(sh, 5);
ok(sh.heir === 5, 'nameHeir sets s.heir');
ok(sh.chronicle.some((c) => c.msg.includes('named heir')), 'nameHeir chronicles event');

// naming the same heir again doesn't stack (already named → replace path)
Game.nameHeir(sh, 5);
ok(sh.heir === 5, 'naming same heir: still 5');

// adding a second notable and switching
sh.notables.push({ id: 6, name: 'Glorp', role: 'the Cook', trait: 'gluttonous', age: 100, life: 1200, titleTier: 0 });
Game.nameHeir(sh, 6);
ok(sh.heir === 6, 'heir switches to new notable');
ok(sh.chronicle.some((c) => c.msg.includes('replacing Grunk')), 'switch chronicles old heir name');

// clearHeir
Game.clearHeir(sh);
ok(sh.heir === null, 'clearHeir sets heir to null');
ok(sh.chronicle.some((c) => c.msg.includes('released')), 'clearHeir chronicles release');

// clearHeir when no heir is a no-op
const before = sh.chronicle.length;
Game.clearHeir(sh);
ok(sh.chronicle.length === before, 'clearHeir with no heir: no chronicle');

// --- nameHeir with invalid id is a no-op ---
const si = Game.fresh(0.3);
si.notables = [{ id: 3, name: 'A', role: 'r', trait: 'bold', age: 0, life: 1200, titleTier: 0 }];
Game.nameHeir(si, 999);
ok(si.heir === null, 'nameHeir with unknown id: heir stays null');

// --- resentment spike when heir dies ---
const sd = Game.fresh(0.3);
sd.notables = [{ id: 7, name: 'Zark', role: 'the Scout', trait: 'bold', age: 1200, life: 1200, titleTier: 0 }];
sd.notableSeq = 7;
Game.nameHeir(sd, 7);
sd.resentment = 0;
// tickNotables fires every 22s — tick 25s to guarantee processing
Game.tick(sd, 25);
ok(sd.heir === null, 'heir death clears s.heir');
ok(sd.resentment > 0, 'heir death raises resentment');
ok(sd.chronicle.some((c) => c.msg.includes('named heir is gone')), 'heir death chronicles crisis');

// --- resentment decays on tick ---
const sr = Game.fresh(0.3);
sr.resentment = 50;
// 90 seconds of ticks (in 1s steps) to get past the holdAccum threshold
for (let i = 0; i < 90; i++) { sr.age = 0; Game.tick(sr, 1); }
ok(sr.resentment < 50, 'resentment decays over time (' + sr.resentment.toFixed(2) + ')');

// --- sanitize: heir coerced ---
const raw = Game.fresh(0.3);
raw.notables = [];
raw.heir = '7';       // string → should become null (not integer)
raw.resentment = 200; // over-capped → 100
const code = Game.exportCode(raw);
const loaded = Game.importCode(code);
ok(loaded !== null, 'save with non-int heir imports');
ok(loaded.heir === null, 'string heir sanitized to null');
ok(loaded.resentment === 100, 'resentment capped to 100 on sanitize');

// --- sanitize: valid integer heir preserved ---
const raw2 = Game.fresh(0.3);
raw2.heir = 5;
raw2.resentment = 30;
const loaded2 = Game.importCode(Game.exportCode(raw2));
ok(loaded2.heir === 5, 'valid integer heir preserved through sanitize');
ok(loaded2.resentment === 30, 'valid resentment preserved');

// --- legacy save (no heir/resentment) migrates cleanly ---
const legacy = Game.fresh(0.3);
delete legacy.heir;
delete legacy.resentment;
const legacyLoaded = Game.importCode(Game.exportCode(legacy));
ok(legacyLoaded && legacyLoaded.heir === null, 'legacy save migrates heir to null');
ok(legacyLoaded && legacyLoaded.resentment === 0, 'legacy save migrates resentment to 0');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
