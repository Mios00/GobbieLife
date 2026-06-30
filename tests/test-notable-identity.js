// N1 — Notable identity: seeded titles, evolving tiers, sanitize/migrate.
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

const GG = ctx.GG, Story = GG.Story, Game = GG.Game;
let pass = 0, fail = 0;
const ok = (c, m) => { c ? pass++ : fail++; if (!c) console.log('  FAIL:', m); };

// --- pools exist ---
ok(Array.isArray(GG.NOTABLE.prefixes) && GG.NOTABLE.prefixes.length >= 20,
  'prefixes pool has >= 20 entries (' + (GG.NOTABLE.prefixes || []).length + ')');
ok(Array.isArray(GG.NOTABLE.epithets) && GG.NOTABLE.epithets.length >= 20,
  'epithets pool has >= 20 entries (' + (GG.NOTABLE.epithets || []).length + ')');
ok(Array.isArray(GG.NOTABLE.of_phrases) && GG.NOTABLE.of_phrases.length >= 20,
  'of_phrases pool has >= 20 entries (' + (GG.NOTABLE.of_phrases || []).length + ')');
ok(GG.NOTABLE.names.length >= 30,
  'names pool has >= 30 entries (' + GG.NOTABLE.names.length + ')');
ok(GG.NOTABLE.roles.length >= 15,
  'roles pool has >= 15 entries (' + GG.NOTABLE.roles.length + ')');

// --- Story.notableTitle exists ---
ok(typeof Story.notableTitle === 'function', 'Story.notableTitle is a function');

// --- tier 0: name + role only ---
const nb0 = { id: 1, name: 'Murt', role: 'the Cook', titleTier: 0 };
const t0 = Story.notableTitle(nb0);
ok(t0 === 'Murt the Cook', 'tier 0 returns "name role" (' + t0 + ')');

// --- tier 1: prefix + name + role ---
const nb1 = { id: 1, name: 'Murt', role: 'the Cook', titleTier: 1 };
const t1 = Story.notableTitle(nb1);
ok(t1.indexOf('Murt the Cook') !== -1, 'tier 1 contains name+role (' + t1 + ')');
ok(t1 !== 'Murt the Cook', 'tier 1 differs from tier 0 (prefix added)');

// --- tier 2: prefix + name + epithet (no bare role) ---
const nb2 = { id: 1, name: 'Murt', role: 'the Cook', titleTier: 2 };
const t2 = Story.notableTitle(nb2);
ok(typeof t2 === 'string' && t2.length > 0, 'tier 2 returns a non-empty string');
ok(t2 !== t1, 'tier 2 differs from tier 1 (' + t2 + ')');

// --- tier 3: full legendary title ---
const nb3 = { id: 1, name: 'Murt', role: 'the Cook', titleTier: 3 };
const t3 = Story.notableTitle(nb3);
ok(typeof t3 === 'string' && t3.length > 0, 'tier 3 returns a non-empty string');
ok(t3 !== t2, 'tier 3 differs from tier 2 (' + t3 + ')');

// --- seeded stability: same id → same title at each tier ---
const nbA = { id: 42, name: 'Veen', role: 'the Raider', titleTier: 3 };
const nbB = { id: 42, name: 'Veen', role: 'the Raider', titleTier: 3 };
ok(Story.notableTitle(nbA) === Story.notableTitle(nbB),
  'same id → identical title (stable)');

// --- different ids produce varied titles ---
const titlesT2 = new Set();
for (let id = 1; id <= 30; id++)
  titlesT2.add(Story.notableTitle({ id, name: 'X', role: 'the Digger', titleTier: 2 }));
ok(titlesT2.size >= 6, 'varied titles across 30 ids at tier 2 (' + titlesT2.size + ' unique)');

// --- titles contain no HTML injection surface (no < > " &) ---
const titlesT3 = [];
for (let id = 1; id <= 50; id++)
  titlesT3.push(Story.notableTitle({ id, name: 'Murt', role: 'the Cook', titleTier: 3 }));
const noHtml = titlesT3.every((t) => !/[<>"&]/.test(t));
ok(noHtml, 'no raw HTML characters in any generated title (safe for esc())');

// --- title length stays sane (≤ 80 chars) ---
const allTiers = [];
for (let id = 1; id <= 20; id++)
  for (let tier = 0; tier <= 3; tier++)
    allTiers.push(Story.notableTitle({ id, name: 'Lumpkin', role: 'the Storyteller', titleTier: tier }));
ok(allTiers.every((t) => t.length <= 80), 'all generated titles ≤ 80 chars');

// --- makeNotable gives titleTier: 0 ---
const s = Game.fresh(0.3);
s.population = 5;
const before = s.notables.length;
// manually call fresh notable spawn by injecting one
const nb = { id: 99, name: 'Test', role: 'the Cook', trait: 'greedy', age: 0, life: 1200, titleTier: 0 };
s.notables.push(nb);
ok(nb.titleTier === 0, 'new notable starts at titleTier 0');

// --- sanitizeState coerces titleTier ---
const raw = Game.fresh(0.3);
raw.notables = [
  { id: 1, name: 'Good', role: 'the Cook', trait: 'greedy', age: 0, life: 1200, titleTier: 2 },
  { id: 2, name: 'Bad',  role: 'the Cook', trait: 'greedy', age: 0, life: 1200, titleTier: 99 }, // clamped to 3
  { id: 3, name: 'Neg',  role: 'the Cook', trait: 'greedy', age: 0, life: 1200, titleTier: -1 }, // clamped to 0
  { id: 4, name: 'Str',  role: 'the Cook', trait: 'greedy', age: 0, life: 1200, titleTier: 'evil' }, // → 0
];
const code = Game.exportCode(raw);
const loaded = Game.importCode(code);
ok(loaded !== null, 'save with bad titleTiers can be imported');
const n1 = loaded.notables.find((x) => x.name === 'Good');
ok(n1 && n1.titleTier === 2, 'valid titleTier=2 preserved through sanitize');
const n2 = loaded.notables.find((x) => x.name === 'Bad');
ok(n2 && n2.titleTier === 3, 'titleTier=99 clamped to 3');
const n3 = loaded.notables.find((x) => x.name === 'Neg');
ok(n3 && n3.titleTier === 0, 'titleTier=-1 clamped to 0');
const n4 = loaded.notables.find((x) => x.name === 'Str');
ok(n4 && n4.titleTier === 0, 'titleTier="evil" coerced to 0');

// --- migrate: legacy notables (no titleTier) default to 0 ---
const legacyRaw = Game.fresh(0.3);
legacyRaw.notables = [
  { id: 1, name: 'OldGob', role: 'the Shaman', trait: 'devout', age: 500, life: 1200 },
];
const legacyCode = Game.exportCode(legacyRaw);
const legacyLoaded = Game.importCode(legacyCode);
const legacyNb = legacyLoaded.notables.find((x) => x.name === 'OldGob');
ok(legacyNb && legacyNb.titleTier === 0, 'legacy notable (no titleTier) migrates to 0');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
