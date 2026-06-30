// F7 — Economy rebalance: DR on producers, utility caps, softened mult, tier upkeep, breakthroughs.
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
const near = (a, b) => Math.abs(a - b) < 1e-9;

// --- building role taxonomy ---
ok(GG.BUILDINGS.mushroomPatch.role === 'producer', 'mushroomPatch role=producer');
ok(GG.BUILDINGS.scrapHeap.role === 'producer', 'scrapHeap role=producer');
ok(GG.BUILDINGS.brewery.role === 'producer', 'brewery role=producer');
ok(GG.BUILDINGS.burrow.role === 'caphouse', 'burrow role=caphouse');
ok(GG.BUILDINGS.warTent.role === 'utility', 'warTent role=utility');
ok(GG.BUILDINGS.tradingPost.role === 'utility', 'tradingPost role=utility');
ok(GG.BUILDINGS.lookout.role === 'utility', 'lookout role=utility');
ok(GG.BUILDINGS.totem.role === 'utility', 'totem role=utility');
ok(GG.BUILDINGS.greatHall.role === 'landmark', 'greatHall role=landmark');

// --- utility / landmark hard caps ---
ok(GG.BUILDINGS.warTent.max === 1, 'warTent max=1');
ok(GG.BUILDINGS.tradingPost.max === 1, 'tradingPost max=1');
ok(GG.BUILDINGS.totem.max === 1, 'totem max=1');
ok(GG.BUILDINGS.lookout.max === 3, 'lookout max=3');
ok(GG.BUILDINGS.greatHall.max === 1, 'greatHall max=1 (unchanged)');

// --- utility building refuses build past max ---
const su = Game.fresh(0.3);
su.resources = { mushrooms: 9999999, scrap: 9999999, shinies: 9999999 };
su.peakPop = 10; su.unlocks.raids = true;
const b1 = Game.build(su, 'warTent', 1);
ok(b1 === 1, 'first warTent build succeeds');
ok(su.buildings.warTent === 1, 'warTent is at level 1');
const b2 = Game.build(su, 'warTent', 1);
ok(b2 === 0, 'second warTent build blocked at max=1');
ok(su.buildings.warTent === 1, 'warTent level unchanged after blocked build');

// --- lookout caps at 3 ---
su.unlocks.raids = true;
su.peakPop = 10;
Game.build(su, 'lookout', 10);
ok(su.buildings.lookout === 3, 'lookout capped at max=3 (got ' + su.buildings.lookout + ')');

// --- diminishing returns: producer output sub-linear beyond softCap ---
const sd = Game.fresh(0.3);
// 5 mushroomPatches — at softCap, output is linear (5 × 0.5 = 2.5)
sd.buildings.mushroomPatch = 5;
const rate5 = Game.rates(sd).mushrooms;
// 10 mushroomPatches — DR: eff = 5 + 5×0.6 = 8 (not 10)
sd.buildings.mushroomPatch = 10;
const rate10 = Game.rates(sd).mushrooms;
// linear would give rate10 = 2 × rate5; DR gives < 2×
ok(rate10 < rate5 * 2, 'producer DR: 10 levels < 2× output of 5 levels (' +
   rate5.toFixed(3) + ' vs ' + rate10.toFixed(3) + ')');
ok(rate10 > rate5, '10 levels still more than 5 levels (DR does not reverse)');

// exactly verify DR formula at level 8: eff = 5 + 3×0.6 = 6.8
const sd8 = Game.fresh(0.3);
sd8.buildings.mushroomPatch = 8;
const rate8 = Game.rates(sd8).mushrooms;
const expected8 = GG.BUILDINGS.mushroomPatch.prod.mushrooms * 6.8
  - Game.totalPop(sd8) * GG.CONFIG.upkeepPerGoblin;
ok(near(rate8, expected8), 'level-8 DR output = 6.8× base (' + rate8.toFixed(4) + ' vs ' + expected8.toFixed(4) + ')');

// --- non-producer buildings use flat level (no DR) ---
// brewery has role=producer so DR applies; verify caphouse (burrow) doesn't have prod — no DR issue
// just confirm nothing breaks for a caphouse
const sc = Game.fresh(0.3);
sc.buildings.burrow = 10;
ok(typeof Game.rates(sc).mushrooms === 'number', 'caphouse (burrow) in rates does not error');

// --- softened global mult: full ladder in 100–300× ---
const sf = Game.fresh(0.3);
for (const def of GG.MILESTONES) sf.milestones[def.id] = true;
const top = Game.globalMult(sf);
ok(top > 100 && top < 300, 'full milestone ladder in 100–300× (got ' + Math.round(top) + '×)');

// --- tier upkeep: settlement maintenance drains mushrooms ---
const st = Game.fresh(0.3);
// tier 0 → no tier upkeep
const upkeep0 = -Game.rates(st).mushrooms; // freshState has 0 pop upkeep since no goblins foraging
// force tier 2 by setting settle
st.settle = 5; // enough for tier 2 (score >= 5)
const upkeep2 = -Game.rates(st).mushrooms;
ok(upkeep2 > upkeep0, 'tier-2 state has higher mushroom drain than tier-0 (' +
   upkeep2.toFixed(3) + ' vs ' + upkeep0.toFixed(3) + ')');
const expectedTierDrain = GG.CONFIG.tierUpkeepPerSec * Game.settlementTier(st);
// mushrooms drain by pop upkeep + tier upkeep (no production at fresh)
const actualTierDrain = upkeep2 - upkeep0;
ok(near(actualTierDrain, expectedTierDrain),
  'tier upkeep drain matches CONFIG.tierUpkeepPerSec × tier (' + actualTierDrain.toFixed(4) + ')');

// --- GG.BREAKTHROUGHS data ---
ok(Array.isArray(GG.BREAKTHROUGHS) && GG.BREAKTHROUGHS.length === 2, 'GG.BREAKTHROUGHS has 2 entries');
ok(GG.BREAKTHROUGHS.find((b) => b.id === 'era2'), 'era2 breakthrough defined');
ok(GG.BREAKTHROUGHS.find((b) => b.id === 'era3'), 'era3 breakthrough defined');

// --- s.breakthroughs defaults to {} ---
const sb = Game.fresh(0.3);
ok(sb.breakthroughs && typeof sb.breakthroughs === 'object', 'fresh state has breakthroughs object');
ok(Object.keys(sb.breakthroughs).length === 0, 'breakthroughs starts empty');

// --- sanitize: only known breakthrough ids, proto keys dropped ---
const sraw = Game.fresh(0.3);
sraw.breakthroughs = { era2: true, era3: true, unknown: true, '__proto__': true };
const code = Game.exportCode(sraw);
const loaded = Game.importCode(code);
ok(loaded !== null, 'save with extra breakthrough keys imports cleanly');
ok(loaded.breakthroughs.era2 === true, 'era2 preserved through sanitize');
ok(loaded.breakthroughs.era3 === true, 'era3 preserved through sanitize');
ok(!loaded.breakthroughs.unknown, 'unknown key dropped');
ok(!Object.prototype.hasOwnProperty.call(loaded.breakthroughs, '__proto__'), '__proto__ key dropped');

// --- legacy save (no breakthroughs field) migrates to {} ---
const legacy = Game.fresh(0.3);
delete legacy.breakthroughs;
const legacyLoaded = Game.importCode(Game.exportCode(legacy));
ok(legacyLoaded && typeof legacyLoaded.breakthroughs === 'object', 'legacy save migrates to breakthroughs:{}');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
