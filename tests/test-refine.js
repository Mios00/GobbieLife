// F8 — Refinement chain (ash / iron / grit)
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

// --- GG.RESOURCES has new entries ---
ok(GG.RESOURCES.ash  && GG.RESOURCES.ash.name  === 'Ash',  'ash resource defined');
ok(GG.RESOURCES.iron && GG.RESOURCES.iron.name === 'Iron', 'iron resource defined');
ok(GG.RESOURCES.grit && GG.RESOURCES.grit.name === 'Grit', 'grit resource defined');
ok(typeof GG.RESOURCES.ash.sym  === 'string' && GG.RESOURCES.ash.sym.length  > 0, 'ash has sym');
ok(typeof GG.RESOURCES.iron.sym === 'string' && GG.RESOURCES.iron.sym.length > 0, 'iron has sym');
ok(typeof GG.RESOURCES.grit.sym === 'string' && GG.RESOURCES.grit.sym.length > 0, 'grit has sym');

// --- GG.BUILDINGS has Smelter and Scrapyard ---
ok(GG.BUILDINGS.smelter   && GG.BUILDINGS.smelter.role    === 'converter', 'Smelter role=converter');
ok(GG.BUILDINGS.smelter   && GG.BUILDINGS.smelter.requires === 'era2',     'Smelter requires era2');
ok(GG.BUILDINGS.smelter   && GG.BUILDINGS.smelter.max     === 3,           'Smelter max=3');
ok(GG.BUILDINGS.smelter   && GG.BUILDINGS.smelter.convert && GG.BUILDINGS.smelter.convert.from.scrap === 2, 'Smelter from.scrap=2');
ok(GG.BUILDINGS.smelter   && GG.BUILDINGS.smelter.convert.from.ash === 1,  'Smelter from.ash=1');
ok(GG.BUILDINGS.smelter   && GG.BUILDINGS.smelter.convert.to.iron  === 0.5,'Smelter to.iron=0.5');
ok(GG.BUILDINGS.scrapyard && GG.BUILDINGS.scrapyard.requires === 'era2',   'Scrapyard requires era2');
ok(GG.BUILDINGS.scrapyard && GG.BUILDINGS.scrapyard.max === 2,             'Scrapyard max=2');
ok(GG.BUILDINGS.scrapyard && GG.BUILDINGS.scrapyard.prod.ash  > 0, 'Scrapyard produces ash');
ok(GG.BUILDINGS.scrapyard && GG.BUILDINGS.scrapyard.prod.grit > 0, 'Scrapyard produces grit');

// --- fresh state has ash/iron/grit resources and new buildings ---
const s0 = Game.fresh(0.3);
ok('ash'  in s0.resources, 'fresh state has ash resource');
ok('iron' in s0.resources, 'fresh state has iron resource');
ok('grit' in s0.resources, 'fresh state has grit resource');
ok(s0.resources.ash  === 0, 'fresh ash=0');
ok(s0.resources.iron === 0, 'fresh iron=0');
ok(s0.resources.grit === 0, 'fresh grit=0');
ok('smelter'   in s0.buildings, 'fresh state has smelter building');
ok('scrapyard' in s0.buildings, 'fresh state has scrapyard building');
ok(s0.buildings.smelter   === 0, 'fresh smelter=0');
ok(s0.buildings.scrapyard === 0, 'fresh scrapyard=0');

// --- Game.rates includes ash/iron/grit keys ---
const rFresh = Game.rates(s0);
ok('ash'  in rFresh, 'rates returns ash key');
ok('iron' in rFresh, 'rates returns iron key');
ok('grit' in rFresh, 'rates returns grit key');

// --- converter rates: Smelter lvl 1 produces iron, consumes scrap and ash ---
const sc = Game.fresh(0.3);
sc.breakthroughs = { era2: true };
sc.resources = { mushrooms: 0, scrap: 1000, shinies: 0, ash: 1000, iron: 0, grit: 50 };
sc.buildings.smelter = 1;
const rSmelter = Game.rates(sc);
ok(rSmelter.scrap < 0,   'Smelter consumes scrap');
ok(rSmelter.ash   < 0,   'Smelter consumes ash');
ok(rSmelter.iron  > 0,   'Smelter produces iron');
ok(rSmelter.scrap === -2, 'Smelter consumes 2 scrap/s per level');
ok(rSmelter.ash   === -1, 'Smelter consumes 1 ash/s per level');
ok(rSmelter.iron  === 0.5,'Smelter produces 0.5 iron/s per level');

// Smelter lvl 2: rates scale with level
const sc2 = Game.fresh(0.3);
sc2.breakthroughs = { era2: true };
sc2.resources = { mushrooms: 0, scrap: 1000, shinies: 0, ash: 1000, iron: 0, grit: 50 };
sc2.buildings.smelter = 2;
const rSmelter2 = Game.rates(sc2);
ok(rSmelter2.scrap === -4,  'Smelter lvl 2 consumes 4 scrap/s');
ok(rSmelter2.iron  === 1.0, 'Smelter lvl 2 produces 1.0 iron/s');

// --- Scrapyard rates: produces ash and grit (net positive grit after its own upkeep) ---
const sy = Game.fresh(0.3);
sy.breakthroughs = { era2: true };
sy.resources.grit = 0;
sy.buildings.scrapyard = 1;
const rScrapyard = Game.rates(sy);
ok(rScrapyard.ash  > 0,  'Scrapyard produces ash');
ok(rScrapyard.grit > 0,  'Scrapyard net grit is positive (grit prod > its own upkeep)');
ok(Math.abs(rScrapyard.ash  - GG.BUILDINGS.scrapyard.prod.ash)  < 0.001, 'Scrapyard ash rate = prod value at lvl 1');

// --- grit upkeep: era-2 buildings consume grit at 0.1/lvl/s ---
const gu = Game.fresh(0.3);
gu.breakthroughs = { era2: true };
gu.resources = { mushrooms: 0, scrap: 1000, shinies: 0, ash: 1000, iron: 0, grit: 50 };
gu.buildings.smelter = 1;
const rGrit1 = Game.rates(gu);
// grit rate from smelter: -0.1 per level (no grit production elsewhere)
ok(rGrit1.grit < 0, 'Smelter (era-2) generates negative grit upkeep');
ok(Math.abs(rGrit1.grit - (-0.1)) < 0.001, 'Smelter lvl 1 grit upkeep = -0.1/s');

gu.buildings.smelter = 3;
const rGrit3 = Game.rates(gu);
ok(Math.abs(rGrit3.grit - (-0.3)) < 0.001, 'Smelter lvl 3 grit upkeep = -0.3/s');

// --- grit starvation: halves era-2 converter output (iron) ---
const gs = Game.fresh(0.3);
gs.breakthroughs = { era2: true };
gs.resources = { mushrooms: 0, scrap: 1000, shinies: 0, ash: 1000, iron: 0, grit: 1 }; // not starved
gs.buildings.smelter = 1;
const rIronFull = Game.rates(gs).iron;
gs.resources.grit = -1; // now starved
const rIronStarved = Game.rates(gs).iron;
ok(rIronStarved < rIronFull, 'iron output reduced when grit < 0');
ok(Math.abs(rIronStarved - rIronFull * 0.5) < 0.001, 'iron output exactly 50% when starved');

// --- starvation: Scrapyard grit production not penalized (allows recovery) ---
const gr = Game.fresh(0.3);
gr.breakthroughs = { era2: true };
gr.buildings.scrapyard = 1;
gr.resources.grit = 1; // not starved
const rAshFull = Game.rates(gr).ash;
const rGritFull = Game.rates(gr).grit;
gr.resources.grit = -1; // starved
const rAshStarved  = Game.rates(gr).ash;
const rGritStarved = Game.rates(gr).grit;
ok(rAshStarved < rAshFull, 'Scrapyard ash output is penalized when grit < 0');
ok(Math.abs(rAshStarved  - rAshFull  * 0.5) < 0.001, 'Scrapyard ash halved when starved');
ok(rGritStarved === rGritFull, 'Scrapyard grit production unchanged when starved (allows recovery)');
ok(rGritStarved > 0, 'Scrapyard still has net positive grit rate when starved');

// --- era-2 gate: cannot build without breakthrough ---
const gb = Game.fresh(0.3);
gb.resources = { mushrooms: 1e6, scrap: 1e6, shinies: 1e6, ash: 1e6, iron: 1e6, grit: 100 };
ok(Game.build(gb, 'smelter')   === 0, 'cannot build Smelter without era2 breakthrough');
ok(Game.build(gb, 'scrapyard') === 0, 'cannot build Scrapyard without era2 breakthrough');
gb.breakthroughs = { era2: true };
ok(Game.build(gb, 'scrapyard') === 1, 'can build Scrapyard with era2 breakthrough');
ok(Game.build(gb, 'smelter')   === 1, 'can build Smelter with era2 breakthrough');
ok(gb.buildings.smelter   === 1, 'smelter incremented after build');
ok(gb.buildings.scrapyard === 1, 'scrapyard incremented after build');

// --- ironCost infrastructure: ironCost blocks build if insufficient iron ---
const savedIronCost = GG.BUILDINGS.smelter.ironCost;
GG.BUILDINGS.smelter.ironCost = 10;
const gi = Game.fresh(0.3);
gi.breakthroughs = { era2: true };
gi.resources = { mushrooms: 1e6, scrap: 1e6, shinies: 1e6, ash: 1e6, iron: 5, grit: 100 };
gi.buildings.smelter = 1; // already have level 1
ok(Game.build(gi, 'smelter') === 0, 'ironCost blocks build when iron insufficient');
gi.resources.iron = 10;
ok(Game.build(gi, 'smelter') === 1, 'ironCost allows build when iron sufficient');
ok(gi.resources.iron === 0, 'ironCost deducted from s.resources.iron');
GG.BUILDINGS.smelter.ironCost = savedIronCost; // restore

// --- sanitizeState: ash/iron/grit clamped to nonneg on import ---
const ev = Buffer.from(JSON.stringify({
  resources: { mushrooms: 0, scrap: 0, shinies: 0, ash: -5, iron: NaN, grit: -100 },
}), 'binary').toString('base64');
const si = Game.importCode(ev);
ok(si !== null, 'import with negative/NaN ash/iron/grit does not crash');
ok(si.resources.ash  >= 0, 'ash clamped to >= 0 on import');
ok(si.resources.iron >= 0, 'iron clamped to >= 0 on import');
ok(si.resources.grit >= 0, 'grit clamped to >= 0 on import');
ok(Number.isFinite(si.resources.ash),  'ash is a finite number after sanitize');
ok(Number.isFinite(si.resources.iron), 'iron is a finite number after sanitize');
ok(Number.isFinite(si.resources.grit), 'grit is a finite number after sanitize');

// --- sanitizeState: unknown keys in buildings dropped ---
const ev2 = Buffer.from(JSON.stringify({
  resources: { mushrooms: 0, scrap: 0, shinies: 0 },
  buildings: { smelter: 2, scrapyard: 1, FAKE_BUILDING: 99 },
}), 'binary').toString('base64');
const si2 = Game.importCode(ev2);
ok(si2 !== null, 'import with fake building does not crash');
ok(si2.buildings.smelter   === 2, 'smelter level preserved after sanitize');
ok(si2.buildings.scrapyard === 1, 'scrapyard level preserved after sanitize');
ok(!('FAKE_BUILDING' in si2.buildings), 'unknown building key dropped by sanitize');

// --- round-trip: ash/iron/grit and new buildings export/import ---
const mid = Game.fresh(0.3);
mid.resources.ash  = 7;
mid.resources.iron = 3;
mid.resources.grit = 12;
mid.buildings.smelter   = 2;
mid.buildings.scrapyard = 1;
const back = Game.importCode(Game.exportCode(mid));
ok(back !== null, 'state with ash/iron/grit and era-2 buildings exports and imports');
ok(back.resources.ash  === 7,  'ash round-trips');
ok(back.resources.iron === 3,  'iron round-trips');
ok(back.resources.grit === 12, 'grit round-trips');
ok(back.buildings.smelter   === 2, 'smelter building round-trips');
ok(back.buildings.scrapyard === 1, 'scrapyard building round-trips');

// --- succession resets ash/iron/grit to 0 ---
const ss = Game.fresh(0.3);
ss.resources.ash  = 50;
ss.resources.iron = 20;
ss.resources.grit = 15;
ss.renown = 30;
Game.finish(ss, 'chaos');
Game.succession(ss);
ok(ss.resources.ash  === 0, 'ash reset to 0 after succession');
ok(ss.resources.iron === 0, 'iron reset to 0 after succession');
ok(ss.resources.grit === 0, 'grit reset to 0 after succession');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
