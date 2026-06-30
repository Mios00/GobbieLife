// E4 — The Reckoning content + the Final Choice
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

// --- Reckoning now has 5 beats (stages 0–4), not 3 ---
ok(GG.Story.reckoningBeat(0, 0) !== null, 'beat 0 exists');
ok(GG.Story.reckoningBeat(4, 0) !== null, 'beat 4 exists (new Oracle prophecy + Bargain)');
ok(GG.Story.reckoningBeat(5, 0) === null, 'beat 5 is null (resolve signal)');
ok(/Oracle|Totem|door|Bargain/i.test(GG.Story.reckoningBeat(3, 0)), 'beat 3 is the Oracle last prophecy');
ok(/door|Bargain|contract/i.test(GG.Story.reckoningBeat(4, 0)), 'beat 4 reveals the Bargain');
// silly variants exist for new beats
ok(/notification|viral|push|metaphor|vibe|lifestyle/i.test(GG.Story.reckoningBeat(3, 1)), 'beat 3 has a silly variant');
ok(/push|vibe|lifestyle|agreeing/i.test(GG.Story.reckoningBeat(4, 1)), 'beat 4 has a silly variant');

// --- finalChoiceText exists ---
const txt = GG.Story.finalChoiceText(0);
ok(typeof txt === 'string' && txt.length > 10, 'finalChoiceText(earnest) returns text');
const txtS = GG.Story.finalChoiceText(1);
ok(typeof txtS === 'string' && txtS.length > 10, 'finalChoiceText(silly) returns text');

// --- naturalChoiceLabel maps each ending ---
for (const id of ['purist', 'multirace', 'chaos', 'villain']) {
  ok(typeof GG.Story.naturalChoiceLabel(id) === 'string', `naturalChoiceLabel(${id}) is a string`);
}

// --- finalChoiceOptions always has "go as you were" ---
const sf = Game.fresh(0.3);
const opts0 = Game.finalChoiceOptions(sf);
ok(Array.isArray(opts0) && opts0.length >= 1, 'finalChoiceOptions returns at least 1 option');
ok(opts0.every((o) => GG.ENDINGS[o._ending]), 'all options map to known endings');
ok(opts0.every((o) => o._isFinalChoice === true), 'all options carry _isFinalChoice flag');

// --- grip door unlocks at holdScore ≥ 40 ---
const sg = Game.fresh(0.3);
sg.stats.cruelty = 82; // holdScore = 41 (> 40)
// set dominant destiny to something other than villain/purist so grip can appear
sg.stats.openness = 100; // makes dominant 'multirace'
sg.tradeCount = 10;
const optsG = Game.finalChoiceOptions(sg);
const hasGrip = optsG.some((o) => o._ending === 'villain' || o._ending === 'purist');
ok(hasGrip, 'grip door appears when holdScore ≥ 40 and destiny is not already grip-type');

// --- grip locked when hold < 40 ---
const sl = Game.fresh(0.3);
sl.stats.openness = 100; sl.tradeCount = 10; // multirace dominant
const optsL = Game.finalChoiceOptions(sl);
const hasGripL = optsL.some((o) => o._ending === 'villain' || o._ending === 'purist');
ok(!hasGripL, 'grip door absent when holdScore < 40 (got ' + Math.round(Game.holdScore(sl)) + ')');

// --- road door unlocks when raidCount ≥ 3 ---
const sr = Game.fresh(0.3);
sr.stats.openness = 100; sr.tradeCount = 10; sr.raidCount = 5; // multirace dominant + raider
const optsR = Game.finalChoiceOptions(sr);
ok(optsR.some((o) => o._ending === 'chaos'), 'road door appears when raidCount ≥ 3');

// --- open-gates door unlocks when tradeCount ≥ 3 ---
const st = Game.fresh(0.3);
st.stats.cruelty = 100; st.raidCount = 5; st.tradeCount = 5; // villain dominant + trader
const optsT = Game.finalChoiceOptions(st);
ok(optsT.some((o) => o._ending === 'multirace'), 'open-gates door appears when tradeCount ≥ 3');

// --- presentFinalChoice sets pendingChoice ---
const sp = Game.fresh(0.3);
ok(sp.pendingChoice === null, 'fresh state: no pendingChoice');
Game.presentFinalChoice(sp);
ok(sp.pendingChoice !== null, 'presentFinalChoice sets pendingChoice');
ok(sp.pendingChoice._isFinalChoice === true, 'pendingChoice has _isFinalChoice flag');
ok(Array.isArray(sp.pendingChoice.options), 'pendingChoice has options array');
ok(typeof sp.pendingChoice.title === 'string', 'pendingChoice has a title');
ok(typeof sp.pendingChoice.text === 'string', 'pendingChoice has text');

// --- resolveChoice with _ending fires Game.finish ---
const sr2 = Game.fresh(0.3);
Game.presentFinalChoice(sr2);
Game.resolveChoice(sr2, 0); // pick first option
ok(sr2.ending !== null, 'resolveChoice with _ending fires Game.finish');
ok(GG.ENDINGS[sr2.ending.id], 'ending id is a valid destiny');
ok(sr2.pendingChoice === null, 'pendingChoice cleared after Final Choice resolution');

// --- each ending reachable via resolveChoice ---
const endingsCovered = new Set();
for (const id of ['purist', 'multirace', 'chaos', 'villain']) {
  const se = Game.fresh(0.3);
  Game.presentFinalChoice(se);
  // inject a matching option
  se.pendingChoice.options = [{ label: 'test', _ending: id, _isFinalChoice: true }];
  Game.resolveChoice(se, 0);
  if (se.ending && se.ending.id === id) endingsCovered.add(id);
}
ok(endingsCovered.size === 4, 'all 4 endings reachable via resolveChoice (' + [...endingsCovered].join(',') + ')');

// --- _isFinalChoice pendingChoice is cleared on sanitize (re-derived from state) ---
const ss = Game.fresh(0.3);
Game.presentFinalChoice(ss);
const code = Game.exportCode(ss);
const loaded = Game.importCode(code);
ok(loaded !== null, 'save with _isFinalChoice pendingChoice imports');
ok(loaded.pendingChoice === null, '_isFinalChoice pendingChoice cleared on sanitize (safe re-derive)');

// --- Game.finish accepts endingId override ---
const sf2 = Game.fresh(0.3);
Game.finish(sf2, 'chaos');
ok(sf2.ending && sf2.ending.id === 'chaos', 'Game.finish respects endingId override');
Game.finish(sf2, 'UNKNOWN_ID'); // unknown id → falls back to scored destiny
// state is already ended, can't easily test the fallback, so just verify it doesn't crash
ok(true, 'Game.finish with unknown id does not crash');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
