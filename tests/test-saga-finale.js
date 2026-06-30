// L4 — The Saga's finale (the Bargain resolves after the final life)
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

// --- CONFIG + data ---
ok(typeof GG.CONFIG.sagaBreakLegend === 'number' && GG.CONFIG.sagaBreakLegend > 0, 'CONFIG.sagaBreakLegend defined');
ok(typeof GG.CONFIG.sagaTurnLegend === 'number' && GG.CONFIG.sagaTurnLegend > GG.CONFIG.sagaBreakLegend, 'CONFIG.sagaTurnLegend > break threshold');
ok(GG.SAGA_ENDINGS && GG.SAGA_ENDINGS.pay && GG.SAGA_ENDINGS.break && GG.SAGA_ENDINGS.turn, 'GG.SAGA_ENDINGS has pay/break/turn');
ok(GG.SAGA_ENDINGS.pay.name && GG.SAGA_ENDINGS.break.name && GG.SAGA_ENDINGS.turn.name, 'each saga ending has a name');

// --- fresh state new fields ---
const s0 = Game.fresh(0.3);
ok(s0.sagaLegendEarned === 0, 'fresh sagaLegendEarned=0');
ok(Array.isArray(s0.founders) && s0.founders.length === 0, 'fresh founders=[]');
ok(s0.sagaEnding === null, 'fresh sagaEnding=null');

// --- Game.finish accrues lifetime legend (sagaLegendEarned, never spent down) ---
const sf = Game.fresh(0.3);
sf.renown = 40;
ok(sf.sagaLegendEarned === 0, 'sagaLegendEarned=0 before finish');
Game.finish(sf, 'chaos');
ok(sf.sagaLegendEarned > 0, 'sagaLegendEarned > 0 after finish');
ok(sf.sagaLegendEarned === sf.sagaLegend, 'first life: earned total == banked pool');
// spending the pool must NOT reduce the lifetime earned total
const beforeEarned = sf.sagaLegendEarned;
const cheap = GG.LEGEND_TREE.find((u) => u.cost <= sf.sagaLegend);
if (cheap) { Game.buyLegend(sf, cheap.id); }
ok(sf.sagaLegendEarned === beforeEarned, 'spending Legend does not reduce sagaLegendEarned');

// --- Game.isFinalLife ---
const il = Game.fresh(0.3);
ok(!Game.isFinalLife(il), 'life 1 is not the final life');
il.sagaLife = GG.CONFIG.sagaLives;
ok(Game.isFinalLife(il), 'life == sagaLives is the final life');
il.sagaLife = GG.CONFIG.sagaLives + 99; // clamp-proof
ok(Game.isFinalLife(il), 'beyond sagaLives still counts as final');

// --- succession records founders + fires the Bargain beat ---
const ss = Game.fresh(0.3);
ss.renown = 20;
Game.finish(ss, 'purist');
const prevName = ss.name;
Game.succession(ss);
ok(ss.founders.length === 1, 'succession pushes one founder');
ok(ss.founders[0].name === prevName, 'founder record carries the prior protagonist name');
ok(ss.founders[0].endingId === 'purist', 'founder record carries the ending id');
ok(ss.founders[0].lifeNum === 1, 'founder record carries the prior life number');
// the Bargain portent appears in the new life's chronicle
ok(ss.chronicle.some((c) => c.kind === 'portent'), 'a Bargain portent is chronicled at the new life');
// a second succession accumulates a second founder
ss.renown = 20;
Game.finish(ss, 'chaos');
Game.succession(ss);
ok(ss.founders.length === 2, 'a second succession accumulates a second founder');
ok(ss.founders[1].lifeNum === 2, 'second founder records life 2');

// --- sagaFinaleOptions gating ---
const go = Game.fresh(0.3);
go.sagaLife = GG.CONFIG.sagaLives;
// low legend → only 'pay'
go.sagaLegendEarned = 0;
go.stats = { greed: 0, cruelty: 0, openness: 0, wanderlust: 0 };
let opts = Game.sagaFinaleOptions(go);
ok(opts.length === 1 && opts[0]._saga === 'pay', 'low legend → only the pay door');
ok(opts[0]._isSagaFinale === true, 'option carries _isSagaFinale');
// enough for break, not turn
go.sagaLegendEarned = GG.CONFIG.sagaBreakLegend;
opts = Game.sagaFinaleOptions(go);
ok(opts.some((o) => o._saga === 'break'), 'break unlocks at the break threshold');
ok(!opts.some((o) => o._saga === 'turn'), 'turn still locked below its threshold');
// enough for turn AND clever (openness >= cruelty by default) → turn unlocks
go.sagaLegendEarned = GG.CONFIG.sagaTurnLegend;
opts = Game.sagaFinaleOptions(go);
ok(opts.some((o) => o._saga === 'turn'), 'turn unlocks at its threshold when clever');
// enough legend for turn but NOT clever (cruelty dominant) → turn stays locked
go.stats = { greed: 0, cruelty: 50, openness: 0, wanderlust: 0 };
opts = Game.sagaFinaleOptions(go);
ok(!opts.some((o) => o._saga === 'turn'), 'turn stays locked when cruelty dominates (not clever)');
ok(opts.some((o) => o._saga === 'break'), 'break still available with high legend + cruelty');

// --- beginSagaFinale ---
const bf = Game.fresh(0.3);
// not the final life → no finale even with an ending
bf.renown = 20;
Game.finish(bf, 'chaos');
ok(Game.beginSagaFinale(bf) === false, 'beginSagaFinale is a no-op when not the final life');
ok(bf.pendingChoice === null, 'no pendingChoice opened on a non-final life');
// final life with an ending → opens the meta-choice
const bf2 = Game.fresh(0.3);
bf2.sagaLife = GG.CONFIG.sagaLives;
bf2.sagaLegendEarned = GG.CONFIG.sagaTurnLegend;
bf2.renown = 20;
Game.finish(bf2, 'multirace');
ok(Game.beginSagaFinale(bf2) === true, 'beginSagaFinale opens on the final life with an ending');
ok(bf2.pendingChoice && bf2.pendingChoice._isSagaFinale === true, 'pendingChoice is the Saga finale choice');
ok(bf2.pendingChoice.options.length >= 1, 'the meta-choice has at least the pay door');
// already resolved → no re-open
const bf3 = Game.fresh(0.3);
bf3.sagaLife = GG.CONFIG.sagaLives;
Game.finish(bf3, 'chaos');
Game.resolveSagaFinale(bf3, 'pay');
ok(Game.beginSagaFinale(bf3) === false, 'beginSagaFinale is a no-op once the Saga is resolved');

// --- resolveSagaFinale ---
const rf = Game.fresh(0.3);
rf.sagaLife = GG.CONFIG.sagaLives;
rf.founders = [{ name: 'Gribl', endingId: 'chaos', endingName: 'The Endless Road', lifeNum: 1 }];
Game.finish(rf, 'villain');
Game.beginSagaFinale(rf);
Game.resolveSagaFinale(rf, 'break');
ok(rf.sagaEnding !== null, 'resolveSagaFinale sets sagaEnding');
ok(rf.sagaEnding.id === 'break', 'sagaEnding id matches the chosen door');
ok(rf.sagaEnding.name === GG.SAGA_ENDINGS.break.name, 'sagaEnding name from GG.SAGA_ENDINGS');
ok(Array.isArray(rf.sagaEnding.text) && rf.sagaEnding.text.length > 0, 'sagaEnding has epilogue text');
ok(rf.pendingChoice === null, 'pendingChoice cleared after resolution');
ok(rf.chronicle.some((c) => /SAGA ENDS/i.test(c.msg)), 'the Saga end is chronicled');
// unknown door coerces to pay
const rf2 = Game.fresh(0.3);
rf2.sagaLife = GG.CONFIG.sagaLives;
Game.finish(rf2, 'chaos');
Game.resolveSagaFinale(rf2, 'bogus_door');
ok(rf2.sagaEnding && rf2.sagaEnding.id === 'pay', 'unknown finale door coerces to pay');

// --- resolveChoice routes a saga-finale option to resolveSagaFinale ---
const rc = Game.fresh(0.3);
rc.sagaLife = GG.CONFIG.sagaLives;
rc.sagaLegendEarned = GG.CONFIG.sagaBreakLegend;
Game.finish(rc, 'chaos');
Game.beginSagaFinale(rc);
const breakIdx = rc.pendingChoice.options.findIndex((o) => o._saga === 'break');
ok(breakIdx >= 0, 'break option present for routing test');
Game.resolveChoice(rc, breakIdx);
ok(rc.sagaEnding && rc.sagaEnding.id === 'break', 'resolveChoice routes _isSagaFinale → resolveSagaFinale');

// --- tick is frozen once the Saga has ended ---
const tk = Game.fresh(0.3);
tk.sagaLife = GG.CONFIG.sagaLives;
tk.buildings.mushroomPatch = 5;
Game.finish(tk, 'chaos');
Game.resolveSagaFinale(tk, 'pay');
const mushBefore = tk.resources.mushrooms;
Game.tick(tk, 10);
ok(tk.resources.mushrooms === mushBefore, 'Game.tick is a no-op once sagaEnding is set (world frozen)');

// --- Story.bargainBeat ---
ok(GG.Story.bargainBeat(1, 0) === null, 'bargainBeat is null for life 1 (no portent yet)');
ok(typeof GG.Story.bargainBeat(2, 0) === 'string' && GG.Story.bargainBeat(2, 0).length > 10, 'bargainBeat returns text for life 2');
ok(typeof GG.Story.bargainBeat(GG.CONFIG.sagaLives, 0) === 'string', 'bargainBeat returns text for the final life');
ok(typeof GG.Story.bargainBeat(2, 1) === 'string', 'bargainBeat has a silly register');

// --- Story.sagaFinaleText / sagaFinaleLabel / sagaEnding ---
const st = Game.fresh(0.3);
st.founders = [{ name: 'Gribl', endingId: 'chaos', endingName: 'The Endless Road', lifeNum: 1 }];
const ftext = GG.Story.sagaFinaleText(st, 0);
ok(typeof ftext === 'string' && ftext.includes('Gribl'), 'sagaFinaleText names the dynasty (first founder)');
ok(typeof GG.Story.sagaFinaleLabel('pay', 0) === 'string', 'sagaFinaleLabel(pay) returns text');
ok(typeof GG.Story.sagaFinaleLabel('turn', 1) === 'string', 'sagaFinaleLabel(turn, silly) returns text');
ok(Array.isArray(GG.Story.sagaEnding('break', st, 0)) && GG.Story.sagaEnding('break', st, 0).length > 0, 'sagaEnding returns paragraph array');
ok(Array.isArray(GG.Story.sagaEnding('turn', st, 1)), 'sagaEnding(silly) returns array');

// --- sanitize / import hardening ---
const ev = Buffer.from(JSON.stringify({
  resources: { mushrooms: 0 },
  sagaLegendEarned: -7,
  founders: [
    { name: '<script>', endingId: 'chaos', endingName: 'ok', lifeNum: 2 },
    { name: 'B', endingId: '__proto__', endingName: 'bad', lifeNum: -3 },
    'not-an-object',
    null,
  ],
  sagaEnding: { id: '__proto__', name: 'evil', text: ['x'] },
  pendingChoice: { _isSagaFinale: true, title: 't', text: 'x', options: [{ label: 'l', _saga: 'pay' }] },
}), 'binary').toString('base64');
const si = Game.importCode(ev);
ok(si !== null, 'import with crafted L4 fields does not crash');
ok(si.sagaLegendEarned >= 0, 'sagaLegendEarned coerced to nonneg');
ok(Array.isArray(si.founders), 'founders is an array after sanitize');
ok(si.founders.every((f) => f && typeof f.name === 'string'), 'founders rebuilt as clean records (non-objects dropped)');
ok(si.founders.length === 2, 'invalid founder entries (string/null) dropped');
ok(si.founders[1].endingId === '', 'unknown founder endingId coerced to empty');
ok(si.founders[1].lifeNum >= 1, 'founder lifeNum clamped to >= 1');
ok(si.sagaEnding === null, 'sagaEnding with unknown id coerced to null');
ok(si.pendingChoice === null, '_isSagaFinale pendingChoice dropped on import (re-derivable)');

// --- founders list is bounded ---
const big = [];
for (let i = 0; i < 50; i++) big.push({ name: 'G' + i, endingId: 'chaos', endingName: 'x', lifeNum: i + 1 });
const ev2 = Buffer.from(JSON.stringify({ resources: { mushrooms: 0 }, founders: big }), 'binary').toString('base64');
const si2 = Game.importCode(ev2);
ok(si2.founders.length <= GG.CONFIG.sagaLives, 'founders list bounded to at most sagaLives entries');

// --- round-trip ---
const mid = Game.fresh(0.3);
mid.sagaLife = 3;
mid.sagaLegendEarned = 15;
mid.founders = [
  { name: 'Gribl', endingId: 'chaos', endingName: 'The Endless Road', lifeNum: 1 },
  { name: 'Grixla', endingId: 'multirace', endingName: 'The Motley Kingdom', lifeNum: 2 },
];
mid.sagaEnding = { id: 'turn', name: GG.SAGA_ENDINGS.turn.name, text: ['An ending.'] };
const back = Game.importCode(Game.exportCode(mid));
ok(back !== null, 'L4 state exports and imports');
ok(back.sagaLegendEarned === 15, 'sagaLegendEarned round-trips');
ok(back.founders.length === 2 && back.founders[1].name === 'Grixla', 'founders round-trip');
ok(back.sagaEnding && back.sagaEnding.id === 'turn', 'sagaEnding round-trips');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
