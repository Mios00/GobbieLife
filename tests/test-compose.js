// C1 — Lore compose engine: seeded RNG, slot-fill, era weighting, tier-1 verbatim.
const fs = require('fs'), vm = require('vm'), path = require('path');
const root = require('path').join(__dirname, '..');

const ctx = {
  console, Math, Date, JSON, parseInt, Number, Array, Object, String, isFinite,
  document: { getElementById: () => ({}), createElement: () => ({}), addEventListener() {} },
  localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
  setInterval: () => 0, setTimeout: () => 0, addEventListener() {},
  btoa: (s) => Buffer.from(s, 'binary').toString('base64'),
  atob: (s) => Buffer.from(s, 'base64').toString('binary'),
  encodeURIComponent, decodeURIComponent, escape, unescape,
};
ctx.window = ctx; vm.createContext(ctx);
for (const f of ['js/data.js', 'js/story.js'])
  vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f });

const GG = ctx.GG, Story = GG.Story;
let pass = 0, fail = 0;
const ok = (c, m) => { c ? pass++ : fail++; if (!c) console.log('  FAIL:', m); };

// --- pools + engine exist ---
ok(GG.LORE_POOLS && typeof GG.LORE_POOLS === 'object', 'GG.LORE_POOLS exists');
ok(GG.LORE_POOLS.templates && typeof GG.LORE_POOLS.templates.deed === 'string', 'deed template present');
ok(typeof Story.compose === 'function', 'Story.compose exists');
ok(typeof Story.seededRng === 'function', 'Story.seededRng exposed');

// --- basic composition produces a non-empty string ---
const line = Story.compose('deed', { era: 1, sill: 0.3, seed: 42, name: 'Murt' });
ok(typeof line === 'string' && line.length > 0, 'compose returns a non-empty string');
ok(line.indexOf('Murt') !== -1, 'ctx scalar {name} substituted into output');

// --- no unfilled slots remain ---
ok(!/\{[a-zA-Z]+\}/.test(line), 'no unfilled {slot} placeholders remain in output');

// --- determinism: same seed + ctx → identical output ---
const a = Story.compose('deed', { era: 1, sill: 0.3, seed: 7, name: 'Pim' });
const b = Story.compose('deed', { era: 1, sill: 0.3, seed: 7, name: 'Pim' });
ok(a === b, 'same seed + ctx is deterministic');

// --- variety: many seeds → many distinct outputs ---
const seen = new Set();
for (let i = 0; i < 30; i++) seen.add(Story.compose('deed', { sill: 0, seed: i, name: 'X' }));
ok(seen.size >= 8, 'varied output across seeds (' + seen.size + ' unique / 30)');

// --- era weighting: era-1-only creature never appears when era=2 ---
let sawEra1Creature = false, sawEra2Creature = false;
for (let i = 0; i < 200; i++) {
  const out = Story.compose('rumor', { era: 2, sill: 0, seed: i });
  if (out.indexOf('pale crawlers') !== -1 || out.indexOf('blind cave-fish') !== -1) sawEra1Creature = true;
  if (out.indexOf('rust-wyrms') !== -1 || out.indexOf('clockwork beetle') !== -1) sawEra2Creature = true;
}
ok(!sawEra1Creature, 'era-1-tagged entries excluded when ctx.era=2');
ok(sawEra2Creature, 'era-2-tagged entries appear when ctx.era=2');

// --- era weighting changes the distribution (era-2 enriched vs untagged) ---
function rate(era, needle, n) {
  let hits = 0;
  for (let i = 0; i < n; i++) if (Story.compose('rumor', { era, sill: 0, seed: i + 1000 }).indexOf(needle) !== -1) hits++;
  return hits / n;
}
const rustWithEra2 = rate(2, 'rust-wyrms', 400);
const rustNoEra = rate(null, 'rust-wyrms', 400);
ok(rustWithEra2 > rustNoEra, 'era-2 weighting raises era-2 entry frequency (' + rustWithEra2.toFixed(2) + ' vs ' + rustNoEra.toFixed(2) + ')');

// --- silliness register: silly-only entries gated to silly draws ---
let sillyLeakInEarnest = false;
for (let i = 0; i < 300; i++) {
  const out = Story.compose('ambient_minor', { sill: 0, seed: i }); // pure earnest
  if (out.indexOf('mayor of a puddle') !== -1 || out.indexOf('on a technicality') !== -1) sillyLeakInEarnest = true;
}
ok(!sillyLeakInEarnest, 'silly-tagged entries never appear at silliness=0');
let sawSillyAtMax = false;
for (let i = 0; i < 300; i++) {
  const out = Story.compose('ambient_minor', { sill: 1, seed: i }); // pure silly
  if (out.indexOf('mayor of a puddle') !== -1 || out.indexOf('on a technicality') !== -1) sawSillyAtMax = true;
}
ok(sawSillyAtMax, 'silly-tagged entries appear at silliness=1');

// --- Tier-1 authored set-piece returned verbatim, ignoring seed ---
const t1a = Story.compose('bargain_due', { seed: 1, sill: 1 });
const t1b = Story.compose('bargain_due', { seed: 999, sill: 0 });
ok(t1a === t1b, 'Tier-1 set-piece identical regardless of seed/sill');
ok(t1a === GG.LORE_POOLS.templates.bargain_due, 'Tier-1 set-piece returned verbatim');

// --- unknown template id → empty string (no crash) ---
ok(Story.compose('does_not_exist', { seed: 1 }) === '', 'unknown template id → empty string');

// --- string seed is accepted and deterministic ---
const sa = Story.compose('deed', { seed: 'Murt-the-Cook', name: 'Murt', sill: 0 });
const sb = Story.compose('deed', { seed: 'Murt-the-Cook', name: 'Murt', sill: 0 });
ok(sa === sb, 'string seed is deterministic');

// --- seededRng: same seed → same sequence; bounded [0,1) ---
const r1 = Story.seededRng(123), r2 = Story.seededRng(123);
let seqMatch = true, inRange = true;
for (let i = 0; i < 50; i++) { const x = r1(), y = r2(); if (x !== y) seqMatch = false; if (x < 0 || x >= 1) inRange = false; }
ok(seqMatch, 'seededRng is reproducible for a given seed');
ok(inRange, 'seededRng output stays in [0,1)');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
