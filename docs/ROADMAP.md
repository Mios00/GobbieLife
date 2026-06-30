# GobbieLife — Adventure & Living World Roadmap

A phased plan to grow GobbieLife from a warren idle-builder into a living fantasy
world: an **adventure pathway**, **per-faction reputation**, **inbound threats
(duels & wars)**, and **world news / disasters**.

> **For future sessions:** this file holds the detailed task scopes. The
> **vision & sequencing** now live in [`REDESIGN.md`](./REDESIGN.md) (agreed
> 2026-06-30). The **full architecture + Era 1–3 integration plan** (approved
> 2026-06-30) is in [`PLAN.md`](./PLAN.md) — read it first for context on
> every pending phase (Era model, economy rebalance, lore engine, notable
> titles, UI metamorphosis, pacing, and the full amended build order).
>
> Target: a **finishable, hours-to-days narrative roguelite-idle** —
> re-centered on a **bounded reincarnation Saga** (a fixed ~3–5 lives that
> resolve in a true meta-finale; mortality *is* prestige), **curated-exponential**
> escalation (bounded, not endless), a **juice** feedback layer, and
> **story-delivery** hierarchy — front-loaded as new phases **F** (Foundations of
> Fun) and **L** (Legacy Loop) *before* more world breadth. Take the first
> unchecked item in the **Amended build order** (in `REDESIGN.md`) whose
> dependencies are met, implement it end-to-end (data + logic + UI + tests), tick
> its box, append a one-line note, and add a changelog entry. Keep tasks
> one-cycle-sized; split anything bigger than a session.

---

## Locked design decisions

1. **Adventure ↔ warren = parallel track.** One save; build the warren *and* send
   adventures. Loot, recruits, materials, and standing flow home. Leaning into
   the road feeds the existing **wanderlust** stat / **Endless Road** destiny.
2. **Adventurers = your notable goblins.** Reuse the roster (`s.notables`). They
   form parties, gain XP/levels/gear, and can die on the road (ties into the
   existing aging/death life-cycle).
3. **Combat = auto-resolve + modifiers.** No click-through fights. Outcome =
   party strength vs threat, with gear/skill/luck rolls, injury/death risk, and
   a narrated Chronicle result. (Optionally a single fight/sneak/parley choice.)
4. **Reputation = per-faction standing.** Each faction rates you
   `Despised → Distrusted → Wary → Tolerated → Respected → Trusted → Allied`.
   Drives trade, who duels you, who marches to war, and which zones are safe.
5. **Faction knowledge is gradual.** Only the few nearest powers are known at
   the start; the rest are *discovered* as the world opens up (chapter
   progression now; exploration & world-news later). ~11 factions to find.

### Round-two defaults (adjustable)
- **War:** multi-stage *defendable event*; outcome weighted by defense strength.
- **Disasters:** mostly overheard flavor; a subset are opt-in opportunities/consequences.
- **Adventure cadence:** real-time expeditions (minutes), like longer zoned raids.
- **Death stakes:** permadeath possible (gear lost or inherited); most outcomes are wounds.

### Story spine (locked) — see the Story Bible below
6. **Spine = "The Bargain."** The procedural origin omens are the *plot*: a hidden hand (the Witch) set the runt on this path, and the endgame is the price of "more" coming due.
7. **The finale is a multi-act *Reckoning*,** not an instant ending. The Great Hall (or a path-specific monument) *triggers* it; the ending is earned at the end of the act.
8. **Four destiny climaxes** (one story, four lenses). **The Mirror = both** a goblin-hunter hero *and* the Snaggletooth rival.
9. **The Final Choice is player-chosen** (destiny/deeds gate which doors open) and is framed around **mortality**: the protagonist ages and dies. Let go / grip tighter / seek immortality / die well. **Twisty, scaled by the Silliness Index.** Dynasty continuation is a stretch (E7).

---

## Architecture conventions (keep new systems consistent)

- **Files:** `js/data.js` (pure data/balance), `js/story.js` (narrative pools),
  `js/game.js` (state + logic, no DOM), `js/ui.js` (render + one delegated click
  handler), `js/main.js` (boot/loop). `css/style.css`, `index.html` shell.
- **State:** add fields to `newState()`. **Every** new field must be:
  (a) defaulted in `newState`, (b) coerced/bounded in `sanitizeState()` (the
  single trust boundary for loads *and* imported save codes — unknown keys
  dropped, types coerced, no markup can survive), (c) covered by a test.
- **Rendering:** build `innerHTML` from data; **escape** all dynamic text via
  `esc()`. Never put untrusted/state strings into HTML unescaped. Dedup
  expensive panels (see chronicle/modal) to avoid per-frame rebuild jank.
- **CSP:** strict (`default-src 'none'`, same-origin scripts only, no inline
  handlers). No external requests, no inline `onclick`. Use `data-act` +
  the delegated handler in `UI.bind`.
- **Ticks:** add `tickX(s, dt)` functions called from `Game.tick`; keep offline
  catch-up (`applyProduction`) cheap and bounded (8h cap). Don't age/kill
  notables during offline.
- **Tests:** Node + `vm` harness with stubbed `document`/`localStorage`, in the
  repo under `tests/test-*.js`, run with **`npm test`** (a zero-dependency runner,
  `tests/run.js`). Each system gets a `test-<system>.js`. Run the whole suite
  before shipping; keep all green.
- **Ship:** commit to the dev branch `claude/push-bundle-gobblelife-rqw28z`
  (this is the **default branch** Pages deploys from), then trigger the
  `pages.yml` workflow. Sync `main` via a merged PR (direct push is proxy-blocked).
  *(If `main` is ever made the default branch, this simplifies to normal pushes.)*

---

## Systems overview

1. **World & Factions** — the set of powers you interact with and your standing.
2. **Reputation / Acceptance** — despised → accepted, per faction.
3. **Adventure track** — expanding zones, expeditions, rewards.
4. **Heroes: skills / levels / gear** — RPG progression for notable goblins.
5. **Inbound threats** — adventurer duels, then kingdom wars.
6. **World news & disasters** — overheard events, some with consequences.
7. **Endgame & Story** — the Reckoning, mortality & succession, the Bargain payoff.

---

## Amended build order  *(authoritative order lives in [`REDESIGN.md`](./REDESIGN.md))*

The order below supersedes the old "blended" sequence. New phases **F**
(Foundations of Fun) and **L** (Legacy Loop) are front-loaded — **make one life
fun → make it loop → then add breadth.** `F*`/`L*` scopes are in `REDESIGN.md`;
`E*`/`T*` scopes are in the phase sections below.

**Done:** T0.1 ✅ · T0.2 ✅ · T0.3 ✅ · E1 ✅ · E2 ✅ · F1 ✅ · F2 ✅ · F3 ✅ · Task 0 ✅ · A1 ✅

1. [x] **F1** — Juice layer ✅
2. [x] **F2** — Curated-exponential rework ✅
3. [x] **F3** — Next-goal tracker + onboarding ✅
4. [x] **F4** — Typed & color-coded Chronicle ✅
5. [x] **C1** — Lore compose engine (authored skeleton + generative slot-fill) ✅
6. [x] **N1** — Notable identity (procedural, evolving titles — notables only) ✅
7. [x] **F6** — Era model + UI metamorphosis ✅
8. [x] **F7** — Economy rebalance + building caps + tier gates + pacing ✅
9. [x] **E3** — Hold (grip) + succession ✅
10. [x] **E4** — The Reckoning content + the Final Choice ✅
11. [ ] **L1** — Succession / reincarnation (world persists; bounded to `sagaLives`)
12. [ ] **L2** — Legend meta-currency (banked at succession)
13. [ ] **L3** — The Legend tree (~6–10 meta-upgrades)
14. [ ] **F8** — Refinement chain (ash/iron/grit)
15. [ ] **F5** — Vista accretion + building ASCII art  *(juice polish)*
16. [ ] **L4** — The Saga's finale (Bargain resolves after the final life)
17. [ ] **T1.1–T1.3** — Adventure v1 (zones → expeditions → party/risk)
18. [ ] **E5** — Destiny climaxes + recurring cast (Mirror, Witch, origin payoff)
19. [ ] **W1** — Era-3 macro-map (territorial control)
20. [ ] **T2.1–T2.2** — Heroes: XP/levels, equipment & inventory
21. [ ] **T3.1–T3.2** — Adventure expansion (higher zones, beasts & bosses)
22. [ ] **E6** — Immortality pacts + endings + epilogues (+ **Heroic/Savior** 5th ending)
23. [ ] **T4.1–T4.2** — Inbound threats (notoriety, adventurer duels)
24. [ ] **T5.1–T5.3** — Wars (defense, declarations, sieges)
25. [ ] **T6.1–T6.2** — Disasters & world-sim polish
- *Slot in when convenient:* **T2.3** (adventure materials), **T3.3** (rich loot tables).

> **E7 (dynasty) is absorbed into Pillar 3 / L1–L4** — no longer a stretch goal; it
> is the spine. Detailed `E*`/`T*` scope/acceptance lives in the phase sections below.

---

## Task cards — pending phases (F4 → W1)

> **Format per card:** Goal · Scope · Files (with anchors) · Reuse · Accept · Test · Guardrails.
> Each card is sized for one Claude cycle. Read `docs/PLAN.md` for full architecture
> context before starting any card. Run `npm test` after every card; keep all green.
> Commit and merge to `main` via PR once a card is complete and verified.

---

### F4 — Typed & color-coded Chronicle

**Goal:** Every chronicle entry carries a `kind` tag; Oracle entries render in teal,
milestone in gold, saga beats get a one-time banner. Makes history scannable.

**Scope:**
- `chronicle(s, msg, kind)` (game.js:332) — add optional `kind` param (default
  `'world'`); store entries as `{ t, msg, kind }` objects instead of plain strings.
- Enum: `oracle | milestone | portent | saga | world | combat | build | event`
- Tag every existing `Game.chronicle(...)` call site in game.js with the correct kind.
- `ui.js` renderAnnals (~line 390, `setHTML($('annals'),...`) — map `kind` to a CSS
  class name (`ck-oracle`, `ck-milestone`, `ck-portent`, `ck-saga`, `ck-world`,
  `ck-combat`, `ck-build`, `ck-event`); wrap each entry in `<span class="ck-KIND">`.
- `css/style.css` — add `.ck-oracle { color: #4ecaca }`, `.ck-milestone { color: gold }`,
  `.ck-portent { color: #c08030 }`, `.ck-saga { font-weight: bold }`, `.ck-world { opacity: 0.7 }`.
- `saga` kind also fires `UI.fx.banner(msg)` once (add to the tick path that calls
  chronicle; banner dedup is handled by `UI.fx.banner`'s existing queue).
- `sanitizeState` (game.js:972): validate `kind` against the enum; unknown → `'world'`.
- `migrate` (game.js:940): legacy string entries → `{ t: 0, msg: entry, kind: 'world' }`.
- Preserve the `chronCount` scroll-lock dedup in ui.js (the early-out if the count
  and last message are unchanged).

**Files:**
- `js/game.js` — line 332 (`chronicle`); line 940 (`migrate`); line 972 (`sanitizeState`); every `Game.chronicle(...)` call site
- `js/ui.js` — ~line 390 (renderAnnals/`setHTML($('annals')`)
- `css/style.css` — add `.ck-*` rules
- `tests/test-chronicle.js` — new file

**Reuse:** `esc()` for all chronicle text; `UI.fx.banner()` (ui.js:29) for saga beats;
`setHTML` (ui.js:65) for the annals panel; existing `chronCount` scroll-lock dedup.

**Accept:**
- Oracle entries render with `ck-oracle` class (teal); milestone = `ck-milestone` (gold).
- A `'saga'` entry triggers exactly one banner (never re-fires on reload).
- Scroll-lock preserved (rapid chronicle appends don't jump the scroll position).
- A tampered save with `kind: "__proto__"` or an unknown string sanitizes to `'world'`.
- Legacy saves (chronicle entries as plain strings) migrate correctly.
- `tests/test-chronicle.js` green; all existing tests still green.

**Test file:** `tests/test-chronicle.js`
- chronicle() stores `{ t, msg, kind }` with correct defaults
- sanitizeState drops unknown kinds → `'world'`
- migrate converts string entries to `{ t:0, msg, kind:'world' }`
- UI class mapping: check output HTML contains `ck-oracle` for oracle entries

**Guardrails:**
- `kind` from state MUST go through the enum allowlist in `sanitizeState` before
  reaching UI — never concatenate a raw state string into a class name.
- Map `kind → 'ck-' + kind` only after validating against the known enum; the
  mapping itself is a static lookup, not a passthrough.
- No new persistent state beyond the `kind` field in each chronicle entry.

---

### C1 — Lore compose engine

**Goal:** `Story.compose(templateId, ctx)` — one generative engine used by the ambient
chronicle firehose, notable deed lines, and (later) N1 title assembly. Reduces repeat
and lets lore react to era/destiny context.

**Scope:**
- Add to `js/story.js`:
  - A simple seeded LCG RNG: `function seededRng(seed)` returning a deterministic
    `next()` → float 0–1. Seed with a numeric id or djb2 hash of a string.
  - `Story.compose(templateId, ctx)` — look up a template string in `GG.LORE_POOLS`,
    fill `{slot}` placeholders by picking from the named pool in `GG.LORE_POOLS`
    filtered by `ctx.era` and `ctx.sill` (earnest/silly register). Return the
    composed string. Ctx shape: `{ era, sill, seed, notableName, faction, ... }`.
  - Context-reactive weighting: if `ctx.era` is set, prefer pools tagged with that
    era; fallback to untagged entries.
- Add to `js/data.js` (after `GG.CHAPTERS`, ~line 787):
  - `GG.LORE_POOLS` — a plain object keyed by slot name. Each slot is an array of
    `{ text, era?, sill? }` entries. Initial pools: `verb` (forage, scavenge, raid…),
    `creature` (rat-kings, shadow-mushrooms…), `place` (the sunken shrine, pit-29…),
    `deed` (sentences for notable deeds), `world_event` (ambient world lines).
  - Earnest/silly variants per entry (match the existing `sill` 0–1 convention in
    story.js's `gslot` helper, line 75).
- Three template tiers in `GG.LORE_POOLS.templates`:
  - **Tier 1** (authored set-pieces): stored as plain text strings keyed by id —
    chapter heralds, Reckoning beats, origin payoffs — returned verbatim by
    `Story.compose(id, ctx)`, never slot-filled. These must NOT be proceduralized.
  - **Tier 2** (templated grammars): sentence skeletons with `{slot}` holes.
  - **Tier 3**: handled by `ctx` weighting, not a separate structure.
- Wire existing story.js functions (`S.ambient`, `S.worldNews`) to call
  `Story.compose` internally (optional but recommended — demonstrates the engine).

**Files:**
- `js/story.js` — add seeded RNG + `Story.compose`; optionally refactor `S.ambient`
  (line 181) and `S.worldNews` (line 343) to use compose
- `js/data.js` after line 787 (`GG.CHAPTERS`) — add `GG.LORE_POOLS`
- `tests/test-compose.js` — new file

**Reuse:** `gslot` (story.js:75) for earnest/silly register picking — extend, don't
replace; `esc()` on all compose output before HTML insertion.

**Accept:**
- `Story.compose('deed', { era: 1, sill: 0.3, seed: 42 })` returns a non-empty string.
- Same seed + same ctx → same output (deterministic).
- Different seeds → varied output (run 20 calls, expect ≥ 8 unique strings on a pool
  of ≥ 10 entries).
- Era tagging: `ctx.era = 2` prefers era-2-tagged pool entries over untagged ones.
- Tier-1 authored set-pieces returned verbatim (no slot substitution).
- All output is a plain string — caller is responsible for `esc()` before HTML.
- `tests/test-compose.js` green; existing tests unchanged.

**Test file:** `tests/test-compose.js`
- Deterministic under fixed seed
- Variety across 20 calls with different seeds
- Era weighting changes output distribution
- Tier-1 template returns verbatim text
- Slot fill produces a complete sentence (no unfilled `{slot}` in output)

**Guardrails:**
- All output from `Story.compose` must be passed through `esc()` before insertion in
  HTML — compose returns raw text, not markup.
- Pools are static data in `data.js`, never loaded from `s.*` (state) — no injection
  surface.
- No `eval`; slot filling uses a simple `str.replace(/\{(\w+)\}/g, ...)` regex.
- Do not proceduralize Tier-1 authored set-pieces under any circumstances.

---

### N1 — Notable identity (procedural, evolving titles)

**Goal:** Notables get deep, semi-random titles that evolve from a simple role to a rich
compound name as they age and do deeds. Seeded per-individual, so two Notables always
differ and replays produce new combinations.

**Scope:**
- Expand `GG.NOTABLE` in `js/data.js` (line 109):
  - Add `prefixes`: `['Iron-Toothed', 'the Bone-Counter', 'Ash-Fingered', ...]` (≥20)
  - Add `epithets`: `['the Unkillable', 'the Ladle-Tyrant', 'of Dubious Merit', ...]` (≥20)
  - Add `of_phrases`: `['of the Sunken Pit', 'of the Ashen Shelf', ...]` (≥10)
  - Keep and expand `names` (≥30) and `roles` (≥15)
- Add `Story.notableTitle(nb, s)` to `js/story.js`:
  - Seed = `nb.id` (or `nb.born` tick cast to int)
  - `titleTier === 0`: return role only ("the Cook")
  - `titleTier === 1`: return prefix + role ("Ash-Fingered the Cook")
  - `titleTier === 2`: return prefix + role + epithet ("Ash-Fingered the Cook, the Ladle-Tyrant")
  - `titleTier === 3`: add of-phrase ("…of the Sunken Pit")
  - Cache result in `nb.title` for display (recompute when `titleTier` changes)
- Title evolution — in the notable-aging tick in `js/game.js`:
  - On age milestones (age 5, 10, 20 years): roll if `titleTier < 3`, advance on luck (20%)
  - On deed/raid events: 10% chance to advance `titleTier`
  - On reaching tier 3: no further evolution
- New per-notable fields: `title` (string, max 80 chars), `titleTier` (int 0–3)
  - Add to notable-spawn defaults in `js/game.js` (where `spawnNotable`/new-notable
    logic runs — grep `notables.push` or `notable.*born`)
  - `sanitizeState` (game.js:972): `title` = `esc(str(nb.title, '').slice(0, 80))`;
    `titleTier` = `Math.min(3, Math.max(0, intNonneg(nb.titleTier)))`
  - `migrate` (game.js:940): if `nb.title` absent, derive from `nb.role` with `titleTier=0`
- `js/ui.js` renderNotables (~line 247): show `nb.title` instead of `nb.role`

**Files:**
- `js/data.js` line 109 (`GG.NOTABLE`) — expand all pools
- `js/story.js` — add `Story.notableTitle`; optionally call `Story.compose` (C1)
  for epithet/of-phrase slot-fill for deeper variety
- `js/game.js` — add `title`/`titleTier` to notable spawn; tick evolution; sanitize + migrate
- `js/ui.js` ~line 247 (renderNotables) — display `nb.title`
- `tests/test-notable-identity.js` — new file

**Reuse:** `Story.compose` (C1) for slot-fill inside title assembly; `esc()` on every
title string in sanitize AND in UI; existing notable-aging tick; `setHTML` for
notables panel (ui.js:65).

**Accept:**
- A fresh notable (titleTier=0) shows role-only ("the Cook").
- After criteria trigger advances titleTier to 1, title gains a prefix.
- Two notables spawned with different ids produce different titles.
- Same notable id always produces the same title for a given tierTier.
- Replays (different silliness/seed) produce different title combos.
- All title strings escaped; no raw state strings in HTML.
- Sanitize drops `title` strings > 80 chars; clamps `titleTier` to 0–3.
- Legacy notables (no `title`/`titleTier`) migrate correctly.
- `tests/test-notable-identity.js` green; all existing tests green.

**Test file:** `tests/test-notable-identity.js`
- Seeded stability (same id → same title at same tier)
- Variety across roster (10 notables → ≥7 unique title prefixes)
- Tier advancement on deed/age criteria
- esc applied (no raw `<>` in output)
- sanitize/migrate coverage

**Guardrails:**
- `nb.title` must go through `esc()` in `sanitizeState` AND again before HTML
  insertion — double-escape is safe; missing esc is not.
- `titleTier` is a coerced int 0–3 in sanitizeState — never a string.
- Pool expansion in data.js must use only plain string literals (no computed values,
  no interpolation — the pools are static data).

---

### F6 — Era model + UI metamorphosis

**Goal:** The game's visual identity shifts as the settlement grows. Crossing an Era
boundary reskins the entire UI and plays a one-time fanfare.

**Scope:**
- Add `Game.era(s)` to `js/game.js` (a small pure function, ~3 lines):
  ```js
  Game.era = function(s) {
    const t = Game.settlementTier(s);
    return t <= 1 ? 1 : t <= 4 ? 2 : 3;
  };
  ```
  If the Reckoning is active (`s.endgame && s.endgame.active`), return `3`.
- `js/ui.js` `UI.render` (line 85): after computing state, call
  `document.getElementById('app').className = 'era-' + Game.era(s)`.
  This is idempotent — the browser ignores a className set to its current value.
- Era-advance fanfare: in `UI.render`, if `Game.era(s)` is not in `s.eraSeen`,
  call `UI.fx.banner('Era ' + Game.era(s) + ' — ' + eraName)` and add to `s.eraSeen`.
  Do NOT mutate `s` inside `UI.render` — instead, call a new `Game.tickEraFanfare(s)`
  function from the sim tick path (main.js) that checks and fires banners into
  `Game.drainBanners()`.
- Add `s.eraSeen` to `newState` (empty array `[]`), sanitize (filter to ints in
  `{1,2,3}`), migrate (default `[]`).
- `css/style.css`: add three palette blocks:
  ```css
  .era-1 { --bg: #0a0a0a; --fg: #7bd36a; --accent: #4a7a3f; }
  .era-2 { --bg: #1a100a; --fg: #c8803a; --accent: #8a4820; }
  .era-3 { --bg: #0a0a14; --fg: #e0e0ff; --accent: #6060c0; }
  ```
  and use CSS variables throughout `style.css` for colors (refactor only as needed —
  don't rewrite the whole sheet).

**Files:**
- `js/game.js` — add `Game.era`; add `Game.tickEraFanfare(s)` (called from
  `Game.tick`); add `s.eraSeen` to `newState` (line 23) / `sanitizeState` (line 972)
  / `migrate` (line 940)
- `js/ui.js` line 85 (`UI.render`) — set `app.className`
- `js/main.js` — `Game.drainBanners()` already wired; `tickEraFanfare` is called
  from `Game.tick` (line 855), so banners drain naturally
- `css/style.css` — add `.era-1/2/3` palette + CSS variable usage
- `tests/test-era.js` — new file

**Reuse:** `Game.settlementTier(s)` (game.js:277); `UI.fx.banner()` (ui.js:29);
`Game.drainBanners()` (game.js:766); existing `setHTML` memoization; `intNonneg`
coercion in sanitizeState.

**Accept:**
- `Game.era(fresh state)` returns `1`.
- Setting `s.buildings.greathall = 1` (tier 5) makes `Game.era` return `3`.
- The `#app` element's className changes to `'era-2'` when crossing tier 2.
- The era-advance banner fires exactly once per era per life (not on reload from save).
- `prefers-reduced-motion` is honoured for any CSS transition in the palette.
- CSP is intact (no inline `style=""` attributes added by JS — only class changes).
- `tests/test-era.js` green; all existing tests green.

**Test file:** `tests/test-era.js`
- `Game.era` boundary math (tier 0,1→1; 2,3,4→2; 5,6→3; Reckoning→3)
- `s.eraSeen` populates correctly on tick
- Banner fires once; does not re-fire after save/reload
- sanitize filters `eraSeen` to `{1,2,3}` only
- No DOM-touching in tests (headless vm context)

**Guardrails:**
- The era class set on `#app` is assembled as `'era-' + era` where `era` is a
  trusted integer computed by `Game.era` — never set it from raw state.
- `s.eraSeen` members are coerced to ints and filtered to `{1,2,3}` in
  `sanitizeState` — an arbitrary string cannot become a CSS class name.
- Do not mutate `s` inside `UI.render` (render is a read-only projection).

---

### F7 — Economy rebalance + building caps + tier gates + pacing

**Goal:** Fix the root cause of "too fast / too easy / infinite building." Four levers,
all in one pass. After this, a scripted run reaches the Reckoning in ~60–120 minutes
of sim-time.

**Root causes (confirmed in code):**
- `Game.rates` (game.js:117): producer output = `def.prod * lvl` with no cap.
  `globalMult` (~×700) multiplies this unboundedly.
- `GG.BUILDINGS` (data.js:134): War Tent / Trading Post / Totem have no `max` field,
  so every extra copy increments `settle` for free.
- Upkeep is flat (not size-scaled), so large settlements are almost free to run.

**Scope (four levers — implement in one task):**

**Lever 1 — Diminishing returns on producers.**
In `Game.rates` (game.js:117), for each building with `role: 'producer'`, replace
`def.prod * lvl` with a DR formula:
```js
const eff = def.prod * Math.pow(lvl, def.growth || 0.75);  // exponent < 1 → DR
```
Tune `growth` per building in `GG.BUILDINGS`. Scrounger/Digger: 0.70; Brewery: 0.65.

**Lever 2 — Hard-cap utility/landmark buildings.**
Add `role` and `max` fields to `GG.BUILDINGS` entries (data.js:134):
- `role: 'producer'` — Mushroom Patch, Scrap Pile, Brew Hall, etc.
- `role: 'utility'` — Lookout Tower (max:3), Totem (max:1), Trading Post (max:1)
- `role: 'landmark'` — Great Hall (already max:1), new Breakthroughs
In `Game.build` (game.js:188): `if (def.max && lvl >= def.max) return false;`
In `js/ui.js` build panel (~line 292): show `(max)` label and disable the button
when `lvl >= def.max`.

**Lever 3 — Steep tier-transition costs + landmark gates.**
Add `GG.BREAKTHROUGHS` to `js/data.js` (after `GG.MILESTONES`, ~line 774):
```js
GG.BREAKTHROUGHS = [
  { id: 'breach_surface', name: 'Breach the Surface',
    desc: 'Tunnel up from the dark. The surface world opens.',
    cost: { mushrooms: 500, scrap: 300 }, unlocks: 'era2' },
  { id: 'stoke_furnaces', name: 'Stoke the Furnaces',
    desc: 'Forge a real industry. The world takes notice.',
    cost: { mushrooms: 5000, scrap: 2000, iron: 100 }, unlocks: 'era3' },
];
```
Add `s.breakthroughs` (`{}` map of `id → true`) to `newState`, sanitize (filter to
known ids from `GG.BREAKTHROUGHS`), migrate (default `{}`).
Gate Era-2 buildings (those requiring `unlocks: 'era2'` — add `requires: 'era2'` to
their `GG.BUILDINGS` entries) — hide/disable in the build panel if not owned.
Add readable tier names to `GG.CHAPTERS` entries as `tierName` strings (e.g.
`'Large Village → Town'` on the chapter that gates Great Hall).

**Lever 4 — Scale upkeep + soften globalMult.**
In `Game.rates` (game.js:117), scale food upkeep by `1 + 0.05 * settlementTier`
(a 5% per-tier multiplier — gentle but compounds).
In `GG.MILESTONES` (data.js:731), reduce `mult` values so `Game.globalMult(s)` stays
≤ ×100 across a full run (current total ~×700 from the ladder). Halve or reduce each
milestone's `mult` value.
CONFIG pacing knobs (data.js:11): add `lifespanMinSec: 3600, lifespanVarSec: 3600`
(replaces any hardcoded values in game.js tickMortality).

**Files:**
- `js/data.js` line 11 (`CONFIG`) — pacing knobs
- `js/data.js` line 134 (`GG.BUILDINGS`) — add `role`/`max`/`growth`/`requires` per entry
- `js/data.js` line 731 (`GG.MILESTONES`) — reduce `mult` values
- `js/data.js` after line 774 — add `GG.BREAKTHROUGHS`
- `js/game.js` line 117 (`Game.rates`) — DR formula + scaled upkeep; use CONFIG pacing knobs
- `js/game.js` line 188 (`Game.build`) — enforce `max`; enforce `requires`
- `js/game.js` line 23 / 972 / 940 — add `s.breakthroughs` to newState/sanitize/migrate
- `js/ui.js` ~line 292 (build panel) — show `(max)` + disable; hide `requires`-gated buildings
- `tests/test-balance.js` — new file; re-pin affected assertions in `tests/test-rates.js`

**Reuse:** `Game.settlementTier` for upkeep scaling; `Game.globalMult` (game.js:152)
for the mult cap check; existing `def.max:1` pattern on Great Hall; `intNonneg` in
sanitize; `esc()` for all build-panel text.

**Accept:**
- A Scrap Pile's 10th copy outputs less per unit than its 1st (DR confirmed).
- War Tent button disabled and labelled `(max)` once 1 is built; building a 2nd
  Totem is blocked at the `Game.build` level.
- Era-2 buildings hidden/disabled without owning `breach_surface`.
- `Game.globalMult(s)` ≤ 100 at any point in a full run.
- A scripted playthrough reaches the Reckoning in ≤ 7200 sim-seconds (120 min).
- `s.breakthroughs` with unknown keys sanitizes to `{}`.
- `tests/test-balance.js` green; `tests/test-rates.js` re-pinned and green; all
  other existing tests green.

**Test file:** `tests/test-balance.js`
- DR: building 10 producers outputs less per unit than building 1
- max enforcement: build past max returns false
- breakthrough gate: era-2 build blocked without breach_surface
- globalMult ≤ 100 after firing all milestones
- pacing: sim 7200 ticks, expect Reckoning possible

**Guardrails:**
- Breakthrough ids in `s.breakthroughs` validated against `GG.BREAKTHROUGHS` in
  sanitizeState — no arbitrary string keys survive.
- `max` is read from static `GG.BUILDINGS` data, never from state.
- Build-panel disable uses the `data-act` disabled pattern (add `disabled` attribute
  or remove the `data-act` attr) — never inline `onclick`.
- Re-pinning F2 rate tests is expected and fine — document in the changelog.

---

### F8 — Refinement chain (Ash / Iron / Grit)

**Goal:** Add mid-game resource depth. Raw scrap + ash refine to iron via the Smelter;
Era-2 buildings cost iron; Grit provides a second upkeep pressure in Era 2.

**Scope:**
- Add to `GG.RESOURCES` (data.js:34): `ash: { name: 'Ash', sym: '🜂' }`,
  `iron: { name: 'Iron', sym: '⚙' }`, `grit: { name: 'Grit', sym: '▪' }` (or ASCII
  equivalents to keep it CSP-safe without emoji — your call).
- Add to `s.resources` in `newState` (game.js:23): `ash: 0, iron: 0, grit: 0`.
- New building **Smelter** in `GG.BUILDINGS` (data.js:134):
  ```js
  smelter: { name: 'Smelter', role: 'converter', max: 3, requires: 'era2',
    desc: 'Converts scrap + ash into iron each tick.',
    cost: { scrap: 200, mushrooms: 100 },
    convert: { from: { scrap: 2, ash: 1 }, to: { iron: 0.5 }, per: 'lvl' } }
  ```
- In `Game.rates` (game.js:117): add converter handling — for each `converter` building
  at `lvl > 0`, consume `from` resources per tick (negative prod) and produce `to`
  resources. Reuse the existing negative-`prod` brewery pattern (data.js:185).
- **Grit** resource: a mechanical upkeep pool. Each Era-2 building generates +0.1 Grit
  upkeep per tick per level. If `s.resources.grit < 0` (i.e. Grit goes negative),
  Era-2 building production is halved. Grit is regenerated by a new `Scrapyard`
  building or by a manual Scrounge action.
- Era-2 buildings (those with `requires: 'era2'` from F7): add `ironCost: N` to their
  `GG.BUILDINGS` entry; deduct from `s.resources.iron` in `Game.build`.
- Gate ash/iron/grit display in `ui.js` renderResources (~line 147): only show if
  `Game.era(s) >= 2`.
- Extend `UI.snapResources` (ui.js:76) to snap ash/iron/grit alongside the existing three.
- Sanitize: `s.resources.ash/iron/grit` = `Math.max(0, Number(v) || 0)` in
  `sanitizeState` (game.js:972). Migrate: default to 0 if absent.

**Files:**
- `js/data.js` line 34 (`GG.RESOURCES`) — add ash/iron/grit
- `js/data.js` line 134 (`GG.BUILDINGS`) — add Smelter; add `ironCost` to Era-2 entries
- `js/game.js` line 117 (`Game.rates`) — converter logic + Grit upkeep
- `js/game.js` line 188 (`Game.build`) — deduct `ironCost`
- `js/game.js` line 23 / 972 / 940 — new resource fields
- `js/ui.js` ~line 147 (renderResources) — gate display by era; snap new resources
- `tests/test-refine.js` — new file

**Reuse:** Negative-prod brewery pattern (data.js:185) as the converter template;
`Game.era(s)` (F6) for display gate; `UI.snapResources` (ui.js:76) — extend; F7 DR
+ caps must keep working across the new resources.

**Accept:**
- With a Smelter at lvl 1, scrap and ash decrease per tick and iron increases.
- An Era-2 building build action deducts `ironCost` from `s.resources.iron`.
- Grit going negative halves Era-2 building output (confirm in rates output).
- Ash/iron/grit display hidden until Era 2 is reached.
- `UI.snapResources` immediately reflects ash/iron/grit after a tap.
- All three new resources sanitized as nonneg numbers.
- `tests/test-refine.js` green; all existing tests green.

**Test file:** `tests/test-refine.js`
- Converter rate: 1 Smelter at lvl 1 → correct resource delta per tick
- Iron gate: build of era-2 building deducts iron; fails if insufficient
- Grit starvation: rates return halved Era-2 output when grit < 0
- Resource sanitize: negative/NaN values clamp to 0

**Guardrails:**
- New resource keys in `s.resources` must be explicitly listed in `sanitizeState` —
  do not passthrough arbitrary keys.
- Converter rates are static data in `GG.BUILDINGS` — never read from state.
- Grit starvation must not freeze the game: cap the penalty at 50% output reduction
  (not 100%) so the game remains recoverable.

---

### W1 — Era-3 macro-map (territorial control)

**Goal:** In Era 3, the goblin polity can push territorial claims against existing
factions, making the geopolitical layer tangible and feeding the Saga finale.

**Scope:**
- Add `s.territory` to `newState` (game.js:23): a plain object `{}` mapping known
  faction ids to a control value 0–100 (0 = none, 100 = fully claimed).
- Add `Game.tickTerritory(s, dt)` to game.js: each tick, faction holdings drift back
  toward 0 at a base rate (`CONFIG.territoryDecay ≈ 0.5/min`); player-held territory
  (> 50) yields a small renown tick and a minor resource trickle into the claiming action.
- New action: `territory:FACTION_ID` — spend iron + shinies to push claim on a faction
  by `+CONFIG.territoryPush` (≈ 5 per action). Only available in Era 3.
- `s.territory` affects `s.standing` drift: high territory over a faction degrades that
  faction's standing by 1 per 10 claim-points above 50 per day (they don't like being
  claimed). Allied factions (standing ≥ 80) resist the drift.
- UI: a territory sub-panel inside `#standing` (or its own `#territory` panel), visible
  only when `Game.era(s) === 3`. Show each known faction with a claim bar and a "push
  border" button (`data-act="territory:FACTION_ID"`).
- `s.territory` sanitize (game.js:972): filter to known faction ids (`GG.FACTIONS` keys
  only); clamp values to `[0, 100]` as integers. Migrate: default `{}`.
- Wire `Game.tickTerritory` into `Game.tick` (game.js:855).
- Wire renown ticks from holdings into `s.renown` (already exists from E2).

**Files:**
- `js/game.js` — add `Game.tickTerritory`; add `s.territory` to newState/sanitize/migrate;
  wire into `Game.tick` (line 855)
- `js/ui.js` — add territory panel render (Era-3 only); add `territory:` action handling
  in the delegated click handler
- `js/data.js` line 11 (`CONFIG`) — add `territoryDecay`, `territoryPush` knobs
- `tests/test-territory.js` — new file

**Reuse:** `GG.FACTIONS` (data.js:68) for valid faction ids; `Game.adjustStanding`
(game.js:248) for territory → standing drift; `Game.era(s)` (F6) to gate display;
`esc()` for faction names; `setHTML` for panel memoization.

**Accept:**
- `s.territory` is populated with `0` for each known faction on first access.
- Spending iron/shinies increases the faction's claim value by `CONFIG.territoryPush`.
- Claim drifts back toward 0 at `CONFIG.territoryDecay` per sim-minute.
- Factions with claim > 50 lose 1 standing point per `10*(claim-50)` per day.
- Territory panel hidden before Era 3.
- `s.territory` sanitize drops unknown faction ids; clamps values 0–100.
- `tests/test-territory.js` green; all existing tests green.

**Test file:** `tests/test-territory.js`
- Drift math: claim decays at the correct rate per tick
- Spend action: claim increases; fails if insufficient iron/shinies
- Standing effect: high claim reduces faction standing over time
- Sanitize: unknown faction ids dropped; values clamped 0–100
- Era gate: action unavailable before Era 3

**Guardrails:**
- Faction ids for `s.territory` keys validated against `GG.FACTIONS` in sanitizeState —
  no arbitrary string keys survive.
- Territory values clamped 0–100 as integers.
- The "push border" action goes through `data-act="territory:FACTIONID"` in the delegated
  handler — never inline handler.
- Era gate is a derived check (`Game.era(s) === 3`), not a stored flag.

---

## Story Bible (endgame canon — keep all endgame content consistent with this)

**Spine — The Bargain.** The procedural origin omens (the witch's tooth-for-"more",
the map with *your* name, the watching crows, the king who "felt cold") are the
**plot**, not flavour. Your rise was foretold/engineered by a hidden hand — **the
Witch**. The endgame pays it off: the price of "more" comes due, and you choose to
**pay it, break it, or turn it back on its maker**. The Oracle's riddles are
*clues*, seeded across the game.

**One story, four lenses.** Write ONE skeleton, reinterpreted by dominant destiny:

| | Pure Warren | Motley Kingdom | Endless Road | The Loom |
|---|---|---|---|---|
| The Witch is… | a purifier who armed you | a trickster testing you | a fellow wanderer | a tempter offering apotheosis |
| "More" means | a wall high enough | a table long enough | a horizon with no edge | a world that kneels |
| The Reckoning is | the Coalition's siege | betrayal at the Congress | the Last Ride / offered throne | the world's final crusade |
| The final cost | who you kept out | who you must forgive | what you'll never have | who's left unafraid |

**Recurring cast.** The **Witch** (hidden hand, ambiguous mentor/puppeteer). The
**Mirror = BOTH** a goblin-hunter hero (survived your very first raid, returns
escalating) AND the **Snaggletooth chief** (dark-twin rival). One **elevated
notable** (your right hand → climactic betrayal or sacrifice; uses the existing
roster + permadeath). The **Oracle/Totem** (guide… or user?).

**Two clocks.** The **Comet / Prophesied Year** (world doom — a long countdown
seeded by your origin omens) and **your Age** (personal doom). The drama is
spending your remaining time before either runs out.

**The Final Choice** (player-chosen; destiny + deeds + Hold gate which doors open):
- **Let go** — name an heir & abdicate. Heir's *personality* drifts the kingdom; warm legacy epilogue.
- **Grip tighter** — no heir, purge rivals. Power now; rising **Resentment** → revolt/betrayal; die un-succeeded → the realm fractures.
- **Seek immortality** — a flavoured pact, each a monkey's-paw: the **Witch** (bound to her design), **Mournhollow** (lich/necropolis), **Ssirvax** (become dragon), **Aelinvar** (alien long-life), or **the Totem** (*become the Oracle*).
- **Die well** — a mortal sacrifice that secures the tale (the defiant **"Tale Untold"**).

**Signature twists.** Origin-omen payoff; **become-the-Oracle** (the riddling voice
you've read all game was a past goblin who chose this — new runs hear *you*); a
groomed heir/notable betrays or falls; **false victory** (raise the Hall, celebrate,
then the *real* threat arrives).

**Hold & succession.** **Hold** = *fear-grip* (built on cruelty; stable while
strong, brittle) vs *loyalty* (openness/generosity/victories; resilient, survives
your death). Betrayal odds = low Hold × high cruelty × old age. Heirs emerge from
notables; succession crises (rival claimants, heir death on adventure).

**Endings.** 4 destiny finales × mortality-response flavour + 5 immortality
flavours + the secret **Tale Untold** + **personalised epilogues** (which factions,
which notables survived, the heir's nature, the city tier, the Silliness Index).

---

## Phase E — Endgame & Story Arcs  *(story track — runs parallel to the world phases)*

> **Sequencing:** **E1 is high priority — build it before deep Adventure work**,
> because a multi-act finale re-paces everything. Then E2 (mortality) → E3
> (Hold/succession) → E4 (the Reckoning ties them together). E5–E6 are
> content-heavy and can interleave with Phases 1–4. E7 is a stretch.

- [x] **E1 — Finale → multi-act Reckoning (scaffold)** ✅
  - Done: `s.endgame = { active, stage, accum }`. Building the Great Hall now calls `Game.beginReckoning` (not `Game.finish`) — sets `unlocks.finale` and starts **The Reckoning**, a staged act. `tickReckoning` advances placeholder beats (`Story.reckoningBeat`, earnest+silly) every `reckoningStageSec`, then calls the relocated `Game.finish` to resolve the ending. The world keeps running during the act; a header **⚔ The Reckoning** marker shows while active. Sanitize/migrate for `s.endgame`. 19 tests.
  - **Hook for E4:** replace the auto-`Game.finish` at the end of `tickReckoning` with the player's **Final Choice**; E5 makes `reckoningBeat` destiny-specific.
- [x] **E2 — Protagonist mortality + the two clocks** ✅
  - Done: `s.age` (advances only in active play, never offline), randomised `s.lifespan` (`lifespanMin/VarSec`), `s.renown` (grows with settlement tier each `renownEverySec`, +2 per raid, shown in header), and `s.comet = { left, total, warned }` (the Prophesied Year, `cometMin/VarSec`). `tickMortality` fires twilight portents at 75%/90% of life (`Story.twilightBeat`) and comet portents at 50/25/10% remaining (`Story.cometBeat`), earnest+silly. **Three roads to the Reckoning:** the Great Hall, death of old age, or the comet's arrival — each calls `Game.beginReckoning`. Header markers (Renown / ⏳ Twilight / ☄ Comet). Sanitize/migrate clamp all fields. 20 tests.
  - **Hook for E3/E4:** death currently rushes straight to the Reckoning — E3 lets a named heir change that outcome; the Final Choice (E4) is where mortality is resolved.
- [ ] **E3 — Hold (grip) + succession**
  - Goal: the power/legacy dilemma as a living system.
  - Scope: `s.hold` (fear vs loyalty composition from cruelty/openness/deeds), `s.heir` (chosen from notables), `s.resentment`. Name-an-heir action; revolt/betrayal rolls (low hold × cruelty × age); succession crises (rival claimant, heir can die on adventure). UI in the Notables/Standing area.
  - Accept: hold responds to deeds; can name/replace an heir; betrayal risk computed; heir death handled; sanitize/migrate; tests.
  - Deps: E2, notables.
- [ ] **E4 — The Reckoning content + the Final Choice**
  - Goal: the climactic act, ending in *your* choice.
  - Scope: staged Reckoning (rising world tension, the Oracle's last prophecy, the Bargain reveal) → present **the Final Choice** from only the doors unlocked by destiny + Hold + deeds (let go / grip / immortality / die well) → resolve to the correct ending. Replace auto-assignment in `Game.finish` with the chosen outcome.
  - Accept: Reckoning plays as stages; Final Choice offers only valid options; each resolves to its ending; tests for gating + resolution.
  - Deps: E1, E2, E3.
- [ ] **E5 — Destiny climaxes + recurring cast**
  - Goal: the four unique climaxes and the people who make them personal.
  - Scope: per-destiny climax content (Coalition siege / Congress betrayal / Last Ride / Final Crusade) selected by dominant destiny; the **Mirror** (hero + Snaggletooth) recurring across acts and appearing at the climax; **Witch** appearances; **origin-omen payoff** referencing this run's specific intro. Earnest + silly registers.
  - Accept: destiny-appropriate climax surfaces; the Mirror recurs and shows at the Reckoning; the run's origin omen is paid off; tests. *(Large — may split per-destiny.)*
  - Deps: E4, T0.1 (factions).
- [ ] **E6 — Immortality pacts + endings expansion + epilogues**
  - Goal: the full ending bouquet and personalised send-offs.
  - Scope: the 5 immortality pacts (Witch/Mournhollow/Ssirvax/Aelinvar/become-the-Oracle), the secret **Tale Untold**, and **epilogues** assembled from run state (factions' fates, surviving notables, heir's nature, city tier, Silliness). The become-the-Oracle pact should canonically explain the Oracle voice. **Also includes:** the 5th `GG.ENDINGS` entry — **Heroic/Savior** (defeat a larger threat with goblin industry: high iron + territory + openness/defense, low cruelty; adds a distinct epilogue to the bouquet).
  - Accept: each immortality ending reachable + gated; secret ending gated; Heroic ending gated by iron/territory/openness; epilogue reflects specifics; tests.
  - Deps: E4, E5, W1 (territory gate for Heroic ending).
- [ ] **E7 — (stretch) Dynasty / generational continuation**
  - Goal: the tale need not end at your death.
  - Scope: on a clean mortal succession, optionally **continue** — the heir inherits world state (standing, notables, factions, city), the founder is recorded as a remembered legend, and a fresh personal arc/age begins. A soft New Game+ *within the same world*.
  - Accept: post-succession continuation carries world state forward; founder logged as legend; new arc starts; tests.
  - Deps: E3, E6.

---

## Phase 0 — World foundation  *(enables everything)*

- [x] **T0.1 — Factions data model & standing + discovery** ✅
  - Goal: a world of named factions, a per-faction standing meter, and *gradual* knowledge of who's out there.
  - Done: `GG.FACTIONS` (11 — Aldermere, Beast-Wilds, Snaggletooth Warren, Tannard, Karzun, Aelinvar, Gorefist Horde, Gilded League, Mournhollow, Thornveil, Ssirvax) with `kind`/`baseStanding`/`startKnown`/`rumor`; `GG.STANDING_TIERS`. State: `s.standing` (-100..100 per faction) + `s.discovered` (only 3 known at start). `Game.standing/standingTier/adjustStanding/isDiscovered/knownFactions/discoverFaction`. Discovery announced in the Chronicle; one new faction revealed per chapter turn (exploration/news will add more later). Full `sanitizeState` coercion (unknown ids dropped, standing clamped, discovery sticky + startKnown forced) + migrate. 24 tests, all green.
  - Next: T0.2 surfaces this in a Standing panel and wires deeds → standing.
- [x] **T0.2 — Standing panel + deeds move standing** ✅
  - Done: `#standing` panel showing only *discovered* factions with a color-coded bar + tier (Despised…Allied) and a "N powers still beyond your knowing" hint. `standing` deltas on choices (`opt.standing`) + auto-events (`fx.standing`); wired burning a village (−Aldermere), striking a caravan deal (+Tannard/Gilded), fighting/allying the Snaggletooth rival (∓), welcoming a race auto-warms its home faction (`gainRace` → Karzun/Aldermere/Aelinvar), and trading warms the merchant powers. Escaped output. 18 tests (shared with T0.3).
- [x] **T0.3 — World news feed** ✅
  - Done: `GG.WORLDNEWS` pool (quakes, plagues, far-off coups, a waking dragon, famine, the walking dead at Mournhollow, storms) with earnest + silly variants; `Story.worldNews` picks register by Silliness; `tickWorldNews` (cadence `worldNewsEverySec`) drops a caravan/wanderer-framed Chronicle line — and ~40% of the time the news IS how you first hear of an undiscovered faction (a second discovery vector beyond chapter turns). Several lines **seed the coming Comet**. Gated to chapter ≥ 1. 18 tests (shared with T0.2).

## Phase 1 — Adventure v1  *(the core new loop)*

- [ ] **T1.1 — Adventure zones model + panel scaffold**
  - Goal: the evolving "what can I do on the road" buttons.
  - Scope: `GG.ZONES` ordered tiers — `nearbyWoods → deepForest → roadside hamlets → human village → town → kingdom → wilds/ruins` — each `{ id, name, threat, reveal:{...}, lootTable }`. `s.adventure = { revealed:[], active:null }`. `#adventure` panel showing revealed zone buttons (start with the woods). Reveal gating by adventure progress + faction standing.
  - Depends: T0.1 (standing gates).
  - Accept: woods visible at start; later zones hidden until gated; tests for reveal logic.
- [ ] **T1.2 — Expeditions: send party, real-time, resolve**
  - Goal: send notable goblins to a zone; they return with a story.
  - Scope: pick a party (1–N notables) → `s.adventure.active = { zone, party, returnsAt }`. On return, auto-resolve (T1.3) → narrated Chronicle result + rewards (shinies/materials/standing/XP) or injury/death. Reuses notables; mirrors the raid timer pattern.
  - Depends: T1.1, notables.
  - Accept: expedition runs over time, resolves once, grants rewards, can wound/kill a party member; tests (forced outcomes).
- [ ] **T1.3 — Party strength & risk model**
  - Goal: outcomes that respond to who you sent and your gear/skills.
  - Scope: `Game.partyStrength(party)` from notable count/level/trait/gear; resolve = strength vs `zone.threat` + luck roll → win/partial/rout; injury vs death rolls (mitigated by a healer trait / Lookout-style factor). Loot scales with margin.
  - Depends: T1.2.
  - Accept: stronger parties win more; weak parties into deep zones risk death; deterministic tests with seeded rolls.

## Phase 2 — Heroes: skills, levels, gear

- [ ] **T2.1 — Hero progression (XP & levels)**
  - Scope: notables gain XP from expeditions → levels; level raises strength; trait synergies. Show level/role/trait in the Notables panel.
  - Depends: T1.2. Accept: XP accrues, level-ups logged, strength scales; tests.
- [ ] **T2.2 — Equipment & inventory**
  - Scope: `GG.GEAR` (weapons/armor/trinkets) drop on adventures; equip to notables; modifiers feed `partyStrength`. Simple inventory UI; on death, gear is lost or inherited.
  - Depends: T2.1. Accept: gear drops, equips, modifies outcomes, handled on death; tests.
- [ ] **T2.3 — Adventure materials (optional)**
  - Scope: a materials resource from adventuring that feeds gear crafting and/or the warren. Defer if scope tight.

## Phase 3 — Adventure expansion

- [ ] **T3.1 — Higher zones gated by standing** (villages/towns/kingdoms unsafe while Despised). Depends: T1.x, T0.2.
- [ ] **T3.2 — Beasts & bosses** — a small bestiary + named boss encounters per tier with rarer loot. Depends: T1.3.
- [ ] **T3.3 — Rich loot tables & rare finds.** Depends: T2.2.

## Phase 4 — Inbound threats (duels)

- [ ] **T4.1 — Notoriety meter** — raids/cruelty/size raise notoriety; ties to villain destiny. Depends: T0.1.
- [ ] **T4.2 — Adventurer challengers** — hostile heroes arrive to duel/kill you, frequency scaled by notoriety & low standing; resolved vs your champions; win → rep/loot, lose → a notable falls. Depends: T4.1, notables, T1.3 (combat math).

## Phase 5 — Wars

- [ ] **T5.1 — Defense layer** — defensive buildings/units (walls, militia from population/notables); `Game.defenseStrength`. Depends: buildings.
- [ ] **T5.2 — War declarations** — a faction at low standing + high settlement tier declares war; countdown → army marches (telegraphed in news). Depends: T0.2, T5.1.
- [ ] **T5.3 — Siege resolution** — multi-stage defendable event weighted by defense strength; outcomes repel / costly win / sacking (losses). Depends: T5.2.

## Phase 6 — Disasters & deeper world

- [ ] **T6.1 — Disasters with consequences** — a subset of world-news become opt-in: refugees (races), regional famine (trade prices), blight (a zone turns dangerous/lucrative). Depends: T0.3, T3.1.
- [ ] **T6.2 — World simulation polish** — standing drift, factions reacting to your deeds, dynamic news. Depends: most of the above.

---

## Backlog / ideas (unscheduled)
- Alliances & joint raids with Allied factions.
- A map/atlas view of discovered places.
- Diplomacy actions (gifts, tribute, treaties) as a standing lever.
- Hero relationships/rivalries among notables (deeper DF flavor).
- Endings that reflect the road (renowned wanderer, dreaded warlord, accepted kingdom).

## Changelog
- 2026-06-30 — **C1** — Lore compose engine: `Story.compose(templateId, ctx)` — a
  seeded, deterministic generative engine over tagged vocabulary pools (`GG.LORE_POOLS`
  in data.js). A seeded LCG (`Story.seededRng`, djb2-hashed for string seeds) makes
  every `(templateId, ctx)` reproducible — deterministic tests + stable within-run
  identity (N1 will seed per-notable). Slot-fill from pools is weighted by `ctx.era`
  (other-era entries excluded, era-matched favoured ~3×) and silliness register
  (`sill`-tagged entries gated to their register). Tier-1 authored set-pieces (no
  `{slot}`) return verbatim — never proceduralized. Output is plain text; callers
  `esc()` at the HTML boundary (no new injection surface — pools are static data, no
  state strings flow through). Existing tuned `S.ambient`/`S.worldNews` distributions
  left untouched (N1 is the first consumer). 20 new tests (`tests/test-compose.js`);
  373 total green across 19 files.
- 2026-06-30 — **F4** — Typed & color-coded Chronicle: `chronicle(s, msg, kind)` with
  8-value enum (`oracle|milestone|portent|saga|world|combat|build|event`); Oracle =
  teal, milestone = gold, portent = amber, saga = bold, world = dimmed, combat = red,
  build = green. Every call site tagged. `kind` validated in `sanitizeState` (unknown →
  `'world'`); legacy entries (no `kind`) migrate to `'world'`. `saga` entries push to
  `pendingBanners` so they surface as one-time banners via the existing drain loop.
  `chronCount` dedup + scroll-lock preserved. 16 new tests (`tests/test-chronicle.js`);
  353 total green.
- 2026-06-30 — **Task 29 (Step 1 docs)** — Rewrote `ROADMAP.md` as single-cycle
  AI-coding-assistant task cards (F4, C1, N1, F6, F7, F8, W1 each with goal/scope/
  files+anchors/reuse/accept/test/guardrails). Added **Three Eras staging spine**
  section + **Target architecture** note to `REDESIGN.md`. Updated amended build
  orders in both docs with the re-sequenced F→C→N→F6→F7→E3→L→F8→L4→T→E5→W1→T→E6
  order. Added `docs/PLAN.md` (the approved 2026-06-30 architecture + Era 1–3 plan)
  and cross-referenced it from `ROADMAP.md` header.
- 2026-06-30 — **A1** — Render & loop hardening (architecture pass). Fixed the two
  "click" bugs: (1) a manual tap now **snaps** the count-up display to the true
  value (`UI.snapResources`) so a `+N` moves the headline number instantly instead
  of being swallowed by the ease; (2) every panel's `innerHTML` is now written only
  when its **generated markup actually changes** (per-panel memoization), so an
  unchanged panel never destroys its own buttons mid-click. Replaced the two
  `setInterval`s with one **requestAnimationFrame** render loop (paint-aligned, no
  double-render) and a **wall-clock-`dt`** sim tick (throttle-accurate, since every
  cadence subsystem accumulates `dt`); easing is now frame-rate-independent.
  9 new tests (`tests/test-render.js`) + real-browser smoke (tap-immediate, 11
  rapid taps in sync, no CSP violations). *(buyAmt relocation to UI-only state
  deferred — low value, would churn the save format + sanitize tests.)*
- 2026-06-30 — **Task 0** — Relocated the test suite into the repo: `scratchpad/`
  was ephemeral (unversioned, lost on container reset). Moved all 16 `test-*.js`
  into `tests/`, normalized the hardcoded root to a `__dirname`-relative path, and
  added a zero-dependency runner wired to `npm test`. 337 assertions green.
- 2026-06-30 — **F3** — Clarity & onboarding: `Game.nextGoal` derives the next chapter requirement (metric + have/need/frac) and renders a header **goal strip** ("◷ Next: grow the tribe to 4 goblins · 2/4 → II — The Warren Wakes" + mini bar), hidden during the Reckoning/ending. `Game.onboardingTip` gives one contextual first-minutes nudge in the actions panel that retires on its own by Chapter II. Both purely derived → no new persistent state. 18 tests + browser smoke. 297 total green.
- 2026-06-30 — **F2** — Curated-exponential escalation: each milestone now grants a persistent global **production multiplier** (`mult`), `Game.globalMult` = their product (×1 fresh → ~×700 across a full bounded ladder, ~3 orders of magnitude). `Game.rates` scales all production by it (upkeep unscaled); manual taps scale by `sqrt(mult)`. **Named magnitude tiers** (`GG.MAGNITUDES` / `Game.magnitude` — a Pittance → a God's Ransom) shown as the Hoard rank + a `×N prod` prosperity caption. Derived purely from the already-sanitized `s.milestones` → **no new persistent state**; every pinned-rate test stays green. 20 tests + browser smoke. 279 total green.
- 2026-06-30 — **F1** — Juice layer: floating `+N` gains on manual clicks, count-up tweening of the Hoard, button-press feedback, and **milestone fanfare banners** (`GG.MILESTONES` — scale thresholds fire once via `Game.checkMilestones`, drained to on-screen banners by the boot loop; `s.milestones` sanitized + primed on load so advanced saves don't banner retroactively). CSP-safe (DOM/CSS only, `prefers-reduced-motion` honoured). 20 tests + real-browser smoke. 259 total green.
- 2026-06-30 — **Scope** — set the target to a **finishable, hours-to-days narrative roguelite-idle**: bounded the reincarnation loop to a fixed ~3–5-life **Saga** (`CONFIG.sagaLives`) that resolves in a **true meta-finale** (L4); relaxed escalation to a finite per-life curve; shrank the Legend tree to ~6–10 upgrades. Deliberately *not* chasing weeks-scale retention (protects the hand-authored writing + a real ending).
- 2026-06-30 — **Redesign** — added [`REDESIGN.md`](./REDESIGN.md): re-centered the game on a reincarnation/legacy prestige loop (mortality = prestige), curated-exponential escalation, a juice feedback layer, and story-delivery hierarchy. New front-loaded phases **F** (Foundations of Fun: F1–F5) and **L** (Legacy Loop: L1–L4); E7/dynasty absorbed into the loop; build order re-sequenced (make one life fun → make it loop → add breadth).
- 2026-06-29 — **E2** — Protagonist mortality (`age`/`lifespan`, active-play only) + Renown + the Comet (`s.comet`) countdown; twilight & comet portents; three roads to the Reckoning (Hall / old age / comet); header markers; sanitize/migrate. 20 tests.
- 2026-06-29 — **E1** — Finale → multi-act Reckoning scaffold: Great Hall begins a staged endgame act (`s.endgame`, `tickReckoning`, `Story.reckoningBeat`) instead of ending instantly; resolves after its beats; header marker; sanitize/migrate. 19 tests.
- 2026-06-29 — **T0.2 + T0.3** — Standing panel (color-coded, discovered factions only) + deeds move standing (raids/deals/welcoming races/trade); World news feed (caravan/wanderer flavor, comet seeds, second discovery vector). 18 tests.
- 2026-06-29 — **Build order** — added a single Blended build order interleaving the world track (T*) and story track (E*); story is woven through, not appended after.
- 2026-06-29 — **Story design** — added the Story Bible (The Bargain spine, one-story-four-lenses, recurring cast, two clocks, the Final Choice, mortality & succession, become-the-Oracle, endings) and **Phase E** (E1–E7) endgame/story tasks.
- 2026-06-29 — **T0.1** — Factions data model (11 factions), per-faction standing + tiers, gradual discovery (chapter-driven for now), sanitize/migrate, 24 tests.
- _(append: date — task id — one line, as tasks are completed)_
