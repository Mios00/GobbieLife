// F6 — Era model + UI metamorphosis: Game.era derivation, eraSeen fanfare, sanitize/migrate.
const fs = require('fs'), vm = require('vm'), path = require('path');
const root = require('path').join(__dirname, '..');

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

// --- Game.era exists and is a function ---
ok(typeof Game.era === 'function', 'Game.era is a function');

// --- Era derivation from settlementTier ---
function stateWithTier(tier) {
  // Fabricate a state where settlementTier will return the desired value.
  // settlementTier = settle + distinctBuildings + floor(peakPop/3)
  // We use settle directly since it's additive.
  const s = Game.fresh(0.3);
  // Map tier to a score above the cut point: cuts = [2,5,8,12,16,21]
  // tier 0 → score 0-1, tier 1 → 2-4, tier 2 → 5-7, tier 3 → 8-11,
  // tier 4 → 12-15, tier 5 → 16-20, tier 6 → 21+
  const scores = [0, 2, 5, 8, 12, 16, 21];
  s.settle = scores[Math.min(tier, 6)];
  return s;
}

ok(Game.era(stateWithTier(0)) === 1, 'tier 0 → era 1');
ok(Game.era(stateWithTier(1)) === 1, 'tier 1 → era 1');
ok(Game.era(stateWithTier(2)) === 2, 'tier 2 → era 2');
ok(Game.era(stateWithTier(3)) === 2, 'tier 3 → era 2');
ok(Game.era(stateWithTier(4)) === 2, 'tier 4 → era 2');
ok(Game.era(stateWithTier(5)) === 3, 'tier 5 → era 3');
ok(Game.era(stateWithTier(6)) === 3, 'tier 6 → era 3');

// --- eraSeen defaults to empty object in a fresh state ---
const s0 = Game.fresh(0.3);
ok(s0.eraSeen && typeof s0.eraSeen === 'object', 'fresh state has eraSeen object');
ok(Object.keys(s0.eraSeen).length === 0, 'eraSeen starts empty');

// --- era fanfare fires once when crossing into era 2 ---
const s2 = stateWithTier(2);
s2.eraSeen = {};
const banners0 = Game.drainBanners();
Game.tick(s2, 0.01);
const banners2 = Game.drainBanners();
ok(banners2.some((b) => b.indexOf('Iron Hunger') !== -1), 'era-2 banner fires on first entry');
const era2Entry = s2.chronicle.find((c) => c.msg.indexOf('Iron Hunger') !== -1);
ok(era2Entry && era2Entry.kind === 'saga', 'era-2 transition chronicles a saga entry');
ok(s2.eraSeen[2] === true, 'eraSeen[2] marked true after fanfare');

// --- era fanfare fires only once (not again on next tick) ---
Game.tick(s2, 0.01);
const banners2b = Game.drainBanners().filter((b) => b.indexOf('Iron Hunger') !== -1);
ok(banners2b.length === 0, 'era-2 banner does not fire a second time');

// --- era 3 fanfare is independent ---
const s3 = stateWithTier(5);
s3.eraSeen = { 2: true }; // already saw era 2
Game.tick(s3, 0.01);
const banners3 = Game.drainBanners();
ok(banners3.some((b) => b.indexOf('World Blight') !== -1), 'era-3 banner fires on first entry');
ok(s3.eraSeen[3] === true, 'eraSeen[3] marked after era-3 fanfare');

// --- starting in era 1 produces no fanfare ---
const s1 = stateWithTier(0);
s1.eraSeen = {};
Game.tick(s1, 0.01);
const banners1 = Game.drainBanners().filter((b) => b.indexOf('Era') !== -1);
ok(banners1.length === 0, 'no era fanfare fired while in era 1');

// --- sanitizeState: valid eraSeen keys preserved ---
const raw = Game.fresh(0.3);
raw.eraSeen = { 2: true, 3: true, 99: true, '__proto__': true };
const code = Game.exportCode(raw);
const loaded = Game.importCode(code);
ok(loaded !== null, 'save with extra eraSeen keys can be imported');
ok(loaded.eraSeen[2] === true, 'eraSeen[2] preserved through sanitize');
ok(loaded.eraSeen[3] === true, 'eraSeen[3] preserved through sanitize');
ok(!loaded.eraSeen[99], 'unknown eraSeen key 99 dropped');
ok(!Object.prototype.hasOwnProperty.call(loaded.eraSeen, '__proto__'), '__proto__ eraSeen key dropped');

// --- migrate: legacy saves (no eraSeen) default to empty object ---
const legacyRaw = Game.fresh(0.3);
delete legacyRaw.eraSeen;
const legacyCode = Game.exportCode(legacyRaw);
const legacyLoaded = Game.importCode(legacyCode);
ok(legacyLoaded && typeof legacyLoaded.eraSeen === 'object', 'legacy save (no eraSeen) migrates to {}');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
