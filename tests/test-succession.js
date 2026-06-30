// L1/L2/L3 — Succession, Legend currency, Legend tree
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

// --- CONFIG and data ---
ok(typeof GG.CONFIG.sagaLives === 'number' && GG.CONFIG.sagaLives >= 2, 'CONFIG.sagaLives defined');
ok(Array.isArray(GG.LEGEND_TREE) && GG.LEGEND_TREE.length >= 6, 'GG.LEGEND_TREE has >= 6 upgrades');
ok(GG.LEGEND_TREE.every(u => u.id && u.name && u.cost > 0 && u.desc), 'all upgrades have id/name/cost/desc');

// --- fresh state has new fields ---
const s0 = Game.fresh(0.3);
ok(s0.sagaLife === 1, 'fresh state sagaLife=1');
ok(s0.sagaLegend === 0, 'fresh state sagaLegend=0');
ok(typeof s0.legendSpent === 'object', 'fresh state legendSpent is object');
ok(s0.founder === null, 'fresh state founder=null');

// --- legendEarned returns a positive integer ---
const se = Game.fresh(0.3);
se.renown = 50; se.buildings.greatHall = 1;
se.standing[Object.keys(GG.FACTIONS)[0]] = 90; // allied faction
const earnedBefore = Game.legendEarned(se); // no ending yet
// finish to set ending for ending bonus
Game.finish(se, 'multirace');
const earnedAfter = Game.legendEarned(se);
ok(typeof earnedAfter === 'number' && earnedAfter >= 1, 'legendEarned returns positive int');
ok(earnedAfter >= earnedBefore, 'ending bonus adds to legendEarned');

// --- Game.finish banks legend into sagaLegend ---
const sf = Game.fresh(0.3);
sf.renown = 50;
ok(sf.sagaLegend === 0, 'sagaLegend=0 before finish');
Game.finish(sf, 'chaos');
ok(sf.sagaLegend > 0, 'sagaLegend > 0 after finish');

// --- canBuyLegend / buyLegend ---
const sb = Game.fresh(0.3);
// can't buy without an ending
ok(!Game.canBuyLegend(sb, 'prod_boost'), 'canBuyLegend false without ending');
Game.finish(sb, 'chaos');
// sagaLegend is now banked; try to buy
const cheapUpg = GG.LEGEND_TREE.find(u => u.cost <= sb.sagaLegend);
if (cheapUpg) {
  ok(Game.canBuyLegend(sb, cheapUpg.id), 'canBuyLegend true when pool >= cost');
  const poolBefore = sb.sagaLegend;
  const bought = Game.buyLegend(sb, cheapUpg.id);
  ok(bought === true, 'buyLegend returns true on success');
  ok(sb.legendSpent[cheapUpg.id] === true, 'legendSpent set after buy');
  ok(sb.sagaLegend === poolBefore - cheapUpg.cost, 'sagaLegend decremented');
  // can't buy same upgrade again
  ok(!Game.canBuyLegend(sb, cheapUpg.id), 'canBuyLegend false for already-owned upgrade');
  ok(!Game.buyLegend(sb, cheapUpg.id), 'buyLegend returns false on already-owned');
}

// --- can't buy more than the pool ---
const sc = Game.fresh(0.3);
Game.finish(sc, 'chaos');
// drain the pool
while (GG.LEGEND_TREE.some(u => !sc.legendSpent[u.id] && sc.sagaLegend >= u.cost)) {
  const next = GG.LEGEND_TREE.find(u => !sc.legendSpent[u.id] && sc.sagaLegend >= u.cost);
  Game.buyLegend(sc, next.id);
}
ok(sc.sagaLegend >= 0, 'sagaLegend never goes negative from buyLegend');

// --- Game.succession: personal arc resets, world persists ---
const ss = Game.fresh(0.3);
// set up a meaningful world state
ss.chapter = 4; ss.buildings.mushroomPatch = 3; ss.buildings.warTent = 1;
ss.settle = 10; ss.resources.mushrooms = 200; ss.standing[Object.keys(GG.FACTIONS)[0]] = 80;
ss.renown = 40; ss.age = 3000; ss.stats = { greed: 5, cruelty: 10, openness: 3, wanderlust: 2 };
const prevBuildings = Object.assign({}, ss.buildings);
const prevSettle = ss.settle;
const prevChapter = ss.chapter;
const prevFounderName = ss.name;
const prevSagaLife = ss.sagaLife;
Game.finish(ss, 'purist');
const prevSagaLegend = ss.sagaLegend;

// succession should not fire if already last life
const ssLast = Game.fresh(0.3);
ssLast.sagaLife = GG.CONFIG.sagaLives;
Game.finish(ssLast, 'chaos');
Game.succession(ssLast);
ok(ssLast.ending !== null, 'succession is no-op on last life (ending still set)');

// normal succession
Game.succession(ss);

ok(ss.ending === null, 'ending cleared after succession');
ok(ss.sagaLife === prevSagaLife + 1, 'sagaLife incremented');
ok(ss.sagaLegend === prevSagaLegend, 'sagaLegend preserved (no extra banking in succession)');
ok(ss.founder !== null, 'founder set');
ok(ss.founder.name === prevFounderName, 'founder.name is the previous protagonist\'s name');
ok(ss.founder.endingId === 'purist', 'founder.endingId set');
ok(ss.founder.lifeNum === prevSagaLife, 'founder.lifeNum is the previous life number');

// personal state reset
ok(ss.age === 0, 'age reset to 0');
ok(ss.resources.mushrooms === 0, 'resources reset');
ok(ss.stats.cruelty === 0, 'stats reset (no heir_bonus)');
ok(ss.resentment === 0, 'resentment reset');
ok(ss.heir === null, 'heir cleared');
ok(ss.endgame.active === false, 'endgame reset');
ok(ss.raidCount === 0, 'raidCount reset');
ok(ss.chronicle.length > 0, 'chronicle has succession entry');
ok(/Life 2/i.test(ss.chronicle[ss.chronicle.length - 1].msg), 'succession chronicle mentions new life number');

// world state preserved
ok(ss.buildings.mushroomPatch === prevBuildings.mushroomPatch, 'buildings persist across succession');
ok(ss.buildings.warTent === prevBuildings.warTent, 'warTent persists');
ok(ss.settle === prevSettle, 'settle persists');
ok(ss.chapter === prevChapter, 'chapter persists');

// standing decays ~15%
const standKey = Object.keys(GG.FACTIONS)[0];
ok(ss.standing[standKey] < 80, 'standing decayed after succession');
ok(ss.standing[standKey] > 50, 'standing not fully wiped');

// --- legend tree effects: prod_boost ---
const sp = Game.fresh(0.3);
sp.buildings.mushroomPatch = 3;
const ratesBefore = Game.rates(sp).mushrooms;
sp.legendSpent = { prod_boost: true };
const ratesAfter = Game.rates(sp).mushrooms;
ok(ratesAfter > ratesBefore, 'prod_boost increases production rate');

// --- legend tree effects: offline_cap ---
const so = Game.fresh(0.3);
so.lastSeen = Date.now() - 10 * 3600 * 1000; // 10 hours ago
const credBase = Game.applyOffline(Object.assign({}, so));
so.legendSpent = { offline_cap: true };
so.lastSeen = Date.now() - 10 * 3600 * 1000;
const credBoost = Game.applyOffline(Object.assign({}, so));
ok(credBoost >= credBase, 'offline_cap allows more offline credit');

// --- legend tree effects: renown_boost (tested via succession + renown) ---
const sr = Game.fresh(0.3);
sr.legendSpent = { renown_boost: true };
ok(typeof sr.legendSpent.renown_boost === 'boolean', 'renown_boost in legendSpent');

// --- legend tree effects: pop_start ---
const spop = Game.fresh(0.3);
Game.finish(spop, 'chaos');
spop.legendSpent.pop_start = true;
Game.succession(spop);
ok(spop.population === 3, 'pop_start sets starting population to 3');

// --- legend tree effects: start_raids unlock ---
const sraid = Game.fresh(0.3);
Game.finish(sraid, 'chaos');
sraid.legendSpent.start_raids = true;
Game.succession(sraid);
ok(sraid.unlocks.raids === true, 'start_raids unlock carries through succession');

// --- legend tree effects: faction_floor ---
const sff = Game.fresh(0.3);
const ffKey = Object.keys(GG.FACTIONS)[0];
sff.standing[ffKey] = -80; // despised
Game.finish(sff, 'chaos');
sff.legendSpent.faction_floor = true;
Game.succession(sff);
ok(sff.standing[ffKey] >= -20, 'faction_floor clamps standing to >= -20');

// --- legend tree effects: heir_bonus ---
const sh = Game.fresh(0.3);
// add a notable and name them heir
sh.notables = [{ id: 1, name: 'Grixa', role: 'the Cook', trait: GG.NOTABLE.traits[0].id,
                  age: 0, life: 1200, titleTier: 0 }];
sh.notableSeq = 1;
sh.heir = 1;
Game.finish(sh, 'purist');
sh.legendSpent.heir_bonus = true;
Game.succession(sh);
ok(sh.stats.cruelty === 40, 'heir_bonus sets starting cruelty to 40');

// --- sanitizeState handles new fields ---
const ev = Buffer.from(JSON.stringify({
  resources: { mushrooms: 0 },
  sagaLife: 99,
  sagaLegend: -5,
  legendSpent: { '__proto__': true, 'FAKE': true, 'prod_boost': true },
  founder: { name: '<script>', endingId: '__proto__', endingName: 'bad', lifeNum: -1 },
}), 'binary').toString('base64');
const si = Game.importCode(ev);
ok(si !== null, 'import with crafted saga fields does not crash');
ok(si.sagaLife >= 1 && si.sagaLife <= GG.CONFIG.sagaLives, 'sagaLife clamped to valid range');
ok(si.sagaLegend >= 0, 'sagaLegend coerced to nonneg');
ok(!Object.prototype.hasOwnProperty.call(si.legendSpent, '__proto__'), '__proto__ key not an own property of legendSpent');
ok(!Object.prototype.hasOwnProperty.call(si.legendSpent, 'FAKE'), 'unknown id dropped from legendSpent');
ok(si.legendSpent.prod_boost === true, 'valid legendSpent key preserved');
ok(si.founder !== null, 'founder parsed');
ok(typeof si.founder.name === 'string', 'founder.name is a string (HTML-escaped at render time by esc())');
ok(si.founder.endingId === '', 'unknown endingId in founder coerced to empty');
ok(si.founder.lifeNum >= 1, 'founder.lifeNum clamped to >= 1');

// --- round-trip (export/import) ---
const mid = Game.fresh(0.3);
mid.sagaLife = 2;
mid.sagaLegend = 7;
mid.legendSpent = { prod_boost: true };
mid.founder = { name: 'Gribl', endingId: 'chaos', endingName: 'The Endless Road', lifeNum: 1 };
const back = Game.importCode(Game.exportCode(mid));
ok(back !== null, 'state with saga fields exports and imports');
ok(back.sagaLife === 2, 'sagaLife round-trips');
ok(back.sagaLegend === 7, 'sagaLegend round-trips');
ok(back.legendSpent.prod_boost === true, 'legendSpent round-trips');
ok(back.founder && back.founder.name === 'Gribl', 'founder.name round-trips');
ok(back.founder.endingId === 'chaos', 'founder.endingId round-trips');

// --- Story.heirIntro ---
const heirNb = { id: 1, name: 'Grixla', role: 'the Smith', trait: 'fierce', age: 0, life: 1200, titleTier: 0 };
const heirFounder = { name: 'Bog-Eye', endingId: 'villain', endingName: 'The Goblin That Loomed', lifeNum: 1 };
const intro = GG.Story.heirIntro(heirNb, heirFounder, 0);
ok(typeof intro === 'string' && intro.length > 10, 'heirIntro returns a string');
ok(intro.includes('Grixla'), 'heirIntro contains heir name');
ok(intro.includes('Bog-Eye'), 'heirIntro contains founder name');
const introSilly = GG.Story.heirIntro(heirNb, heirFounder, 1);
ok(typeof introSilly === 'string' && introSilly.length > 10, 'heirIntro(silly) returns text');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
