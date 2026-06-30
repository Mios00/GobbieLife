# Plan — Era 1–3 integration + architecture hardening + lore engine + balance

## Context

The user drafted an **Era 1–3** roadmap and asked: integrate or clean slate?
**Finding:** ~80% is already built; clean slate would discard a working,
CSP-hardened engine *and* the hand-authored writing (the moat). **Integrate.**

The user then layered on: color-coded Chronicle, richer *evolving* Notable titles,
a deeper hybrid **lore library**, an explicit **backend/architecture review**
(prevent "click not registering / value not changing", streamline, suggest a
target architecture + language/tooling), an economy **rebalance** (production runs
away; infinite building is too easy), a **pacing** change, and a mandate that
**ROADMAP.md** be rewritten as single-Claude-cycle task cards with enough context
to hand to an AI coding assistant.

**Decisions locked with the user (2026-06-30):**
1. **Direction = skin + staging layer that keeps the Saga.** The three Eras are
   the visual + progression arc of ONE life inside the bounded reincarnation Saga
   (REDESIGN.md). Not a replacement of that direction.
2. **Adopt all four Era mechanics:** UI metamorphosis, paradigm-shift gates,
   refinement chain, Era-3 macro-map.
3. **Chronicle:** color-code by type (Oracle = teal, …).
4. **Notables:** deep, semi-random, evolving titles. **Faction names: notables
   only for now** — authored factions stay canon.
5. **Rebalance with all four levers:** producer diminishing returns, hard-cap
   utility/landmark buildings, steep tier-transition costs + gates, scale upkeep +
   soften the global multiplier.
6. **Pacing → ~60–120 min/life** (the user's lighter option; see note below).
7. **Lore → hybrid** (authored skeletons + generative slot-fill) — recommended.
8. **Architecture review + target architecture added to this plan** (below).

### Pacing answer (60–120 min/life)
60–120 fits better than 90–180 and is the right **default**: the four economy
levers do the difficulty work, so a shorter clock still feels weighty, and it
respects the *finishable-Saga* thesis (270 × 5 lives ≈ 22 h of **active** play
risks the ending receding). Lives also lengthen *naturally* across the Saga as
more systems unlock, so you get escalating life-length without a longer clock.
Implement as `CONFIG` knobs (`lifespanMinSec ≈ 3600`, `lifespanVarSec ≈ 3600`;
`cometMinSec ≈ 4500`, `cometVarSec ≈ 3600`), re-dialed in L1/L4 playtest.

---

## Architecture review (game-designer / backend lens)

### Findings (ranked; all verified in code)
1. **Tests live in `scratchpad/`, not the repo** — unversioned, unshipped, lost on
   container reset. *Biggest process risk.* → Move to `tests/`, first.
2. **"+1 tap doesn't move the headline number"** — `renderResources` eases the
   shown value 30%/frame (ui.js:132); a `+1` gain rounds back to the same integer
   that frame, so a tap visibly does nothing. *Exactly the user's complaint.*
3. **Every panel rebuilds `innerHTML` up to 4×/sec** (main.js:67 + :75); only
   Chronicle/Modal dedup. A render landing mid-gesture destroys the pressed button
   → the browser drops the `click` (intermittent "click not registering"); also
   nukes focus/hover/`:active`/selection every frame and wastes work.
4. **Sim/render coupling**: `setInterval` passes a fixed `dt=1.0s` regardless of
   real elapsed time, is throttled in background tabs, and the 1000ms+250ms timers
   double-render at the 1 s boundary. No `requestAnimationFrame`.
5. **UI state on the game object**: `s.buyAmt` (a view selector) is persisted and
   must be sanitized — minor coupling smell.
6. **The single delegated handler on `document` (ui.js:497) is correct** — keep
   it. The problem is render *scope/cadence*, not the listener.

### Target architecture (the recommendation to add to the plan)
**Language/runtime/source:** **stay vanilla JS — no framework, no bundler, no
runtime deps — in the shipped artifact.** This is the *security-correct* choice for
the user's stated goals: a public release with no injection surface (no npm tree to
audit), a strict CSP (`script-src 'self'`, no `unsafe-inline`/`eval` — most
frameworks need a build step or eval), and `file://` support. The moat is the
writing, not the rendering tech; a framework adds attack surface for ~zero
gameplay gain. **Add discipline, not dependencies:**
- **`// @ts-check` + JSDoc types** on the core modules (esp. the state shape and
  `Game.*` signatures). TypeScript-grade checking — catches the typo'd-field /
  wrong-arg bugs behind "value not changing" — with **no build step, no runtime
  dep** (dev-only `tsc --noEmit` or the editor). Shipped code stays plain JS.
- **First-class in-repo tests** via Node's built-in `node:test` + `node:assert`
  (zero deps), loading modules through the existing `vm` sandbox. Add
  `node tests/run.js` (and an `npm test` alias). Versioned, CI-able, survives
  resets.
- **A state-shape contract**: one JSDoc `@typedef` mirrored by `newState` +
  `sanitizeState`, plus a dev assertion that *every* `newState` key is handled by
  `sanitizeState` — automates the "new field must be sanitized" guardrail.
- **Render scheduler** (own concern): per-panel **dirty-flagging** (generalize the
  Chronicle/Modal signature-dedup to all panels) so a panel rebuilds only when its
  data changed; a single **`requestAnimationFrame`** paint pass; and a
  **fixed-timestep sim accumulator** that steps on real elapsed time (throttle/
  catch-up safe). Keep the delegated handler.
- Keep the existing module boundaries (data/story/game/ui/main) — they're good.

---

## The reconciliation model (the keystone)

```
SAGA = a fixed ~3–5 LIVES (REDESIGN.md L1–L4) → true meta-finale
  └ LIFE = one authored arc, runs through the THREE ERAS as its dramatic shape
       └ ERA = a coarse act-grouping over the existing 7 settlement tiers
            └ CHAPTER = the existing fine-grained beats (GG.CHAPTERS)
```
- **Era is derived, not stored.** `Game.era(s)` groups `Game.settlementTier(s)`
  (0–6, game.js:277): Era 1 Feral (0–1), Era 2 Iron Hunger (2–4), Era 3 World
  Blight (5–6 / Reckoning). Tune cut points to land on a breakthrough.
- **Saga rides on top unchanged**; succession persists the world; Legend (L3)
  lifts a new life's starting era; L4 resolves the Bargain after the final life.
- **Endings reconcile 1:1**: existing 4 destinies = Era-3 alignments;
  **Heroic/Savior** added as a 5th (E6).

---

## Step 1 — Docs + test-relocation first

- **Task 0 — Relocate tests into the repo** (`scratchpad/test-*.js` → `tests/`,
  `node:test` runner, `npm test`). Do this *before* new code so nothing else is
  written against ephemeral tests.
- **`docs/REDESIGN.md`** — add **"The Three Eras (staging spine)"** (the nesting,
  `Game.era` derivation + cut points, explicit "shape of a life, not a replacement
  of the loop"), and a short **"Target architecture"** note mirroring the review
  above. Cross-reference the new phases.
- **`docs/ROADMAP.md` — rewrite as single-cycle task cards.** Every phase below is
  decomposed into tasks each completable in one Claude cycle, each card carrying:
  *goal · scope · files to touch (with anchors) · existing functions to reuse ·
  acceptance criteria · test file name · guardrail reminders*. Enough self-
  contained context to hand to an AI coding assistant cold. Insert into the
  Amended build order; add a changelog line.

## Step 2 — Phases (each shipped end-to-end: data + logic + UI + tests)

> Guardrails (all phases): new persistent fields defaulted in `newState`
> (game.js:23), coerced/bounded in `sanitizeState` (game.js:972), handled in
> `migrate` (game.js:940), test-covered. All dynamic text via `esc()`. No inline
> handlers / external requests / `eval`. Clock-driven systems are `tickX(s, dt)`.

### A1 — Render & loop hardening  *(do early; fixes the click bugs)*
- **Scope:** (a) snap the count-up `disp` to actual on manual/trade/build gains so
  taps read instantly (fixes finding #2); (b) generalize per-panel signature-dedup
  to all panels so a panel rebuilds only on data change (fixes #3); (c) replace the
  two `setInterval`s with one rAF render pass + a fixed-timestep sim accumulator on
  real elapsed time (fixes #4); (d) move `buyAmt` to UI-owned state (#5). Keep the
  delegated handler.
- **Accept:** a tap immediately changes the headline number; the Build panel does
  not rebuild while resources merely tick (verify no mid-gesture node churn);
  background-tab time stays consistent with active; existing behaviour (scroll-lock,
  modal anti-flicker) preserved; `tests/test-render.js` (tap-snap, dirty-flag
  signatures, fixed-step accumulator math).

### F4 (expanded) — Typed & color-coded Chronicle  *(already queued)*
- **Scope:** `chronicle(s, msg, kind)` (game.js:332) → store `{ t, msg, kind }`,
  default `'world'`. Enum: `oracle · milestone · portent · saga · world · combat ·
  build · event`. Tag every call site. In `ui.js` map `kind`→CSS class: **Oracle =
  teal**, milestone = gold, portent = ominous, saga = emphasized moment-card (+
  banner-once via `UI.fx.banner`), world = dim. Sanitize `kind` to the enum
  (unknown→`'world'`); migrate legacy (no kind→`'world'`). Preserve the F3
  `chronCount` scroll-lock dedup.
- **Accept:** Oracle teal, types distinct, big saga beats banner once, scroll-lock
  preserved, enum-sanitize drops bogus kinds, legacy migrates; `tests/test-chronicle.js`.

### C1 — Lore compose engine (authored skeleton + generative slot-fill)
- **Recommendation = hybrid, three tiers:** *Tier 1* fully authored set-pieces for
  load-bearing beats (chapter heralds, Reckoning, Final Choice, immortality pacts,
  Witch/Mirror/origin payoffs) — never proceduralized. *Tier 2* templated grammars
  for the ambient firehose (every-45 s chronicle, notable deeds, world news, minor
  events): sentence skeletons with typed slots filled from tone/era/destiny-tagged
  vocab pools. *Tier 3* context-reactive weighting + light "memory" (reference the
  founder, a burned faction) so history feels causal and colourful.
- **Scope:** one pure `Story.compose(templateId, ctx)` engine + tagged pools
  (pools in `data.js`/`story.js`, assembly in `story.js`), seeded RNG (per-entity/
  per-event) for deterministic tests and within-run stability. **Reused by N1
  (titles) and the richer event library** — one engine, many surfaces. Output via
  `esc()` + F4 `kind` tags.
- **Accept:** ambient/world/deed lines vary combinatorially (low repeat across a
  run), register-correct (Silliness), deterministic under a fixed seed, no
  load-bearing beat is proceduralized; `tests/test-compose.js`.

### N1 — Notable identity (procedural, evolving titles)  *(notables only)*
- **Scope:** built on C1. Expand `GG.NOTABLE.names` + component pools (prefix
  adjectives, roles, earned epithets, "of the X"). `Story.notableTitle(nb, s)`
  assembles a seeded-per-notable title (stable per individual, varied across roster
  + runs). **Evolution:** upgrade the epithet on criteria/luck (age tiers, raids
  survived, deeds) — Cook→"the Ladle-Tyrant", survivor Raider→"the Unkillable".
  New per-notable fields (`title`, `titleTier`) → sanitize (string-coerce, length
  cap, `esc`) + migrate (derive from role if absent). Factions stay authored.
- **Accept:** rich combined titles; titles evolve on criteria/luck; seeded
  stability; replays vary; all escaped; sanitize/migrate covered;
  `tests/test-notable-identity.js`.

### F6 — Era model + UI metamorphosis
- **Scope:** `Game.era(s)` (derived; no new state). `UI.render` sets
  `app.className = 'era-' + Game.era(s)` on `#app` (index.html:18). Three CSS
  palettes (`.era-1/2/3`): feral black void → rusty industrial → brutalist terminal
  (`█ ▓ ║`). One-time era-advance fanfare (reuse `UI.fx.banner`; mark via sanitized
  `s.eraSeen`).
- **Accept:** crossing a boundary reskins the UI + one banner; reduced-motion
  honoured; CSP/`file://` intact; `tests/test-era.js`.

### F7 (expanded) — Economy rebalance, building taxonomy, caps & tier gates
*The "too fast / too easy / infinite building" fix. All four levers.*
- **Root causes (confirmed):** building output is linear-in-level, uncapped
  (`def.prod*lvl`, game.js:124); `globalMult` (~×700) multiplies that unbounded
  base while upkeep is unscaled (game.js:143); War Tent/Trading Post/Totem have no
  `prod` and no `max`, so extra copies do nothing but a free `settle++` tier-
  inflate.
- **Scope:** (1) **diminishing returns** on producers (decaying marginal output
  and/or higher `growth`); (2) **hard-cap** utility/landmark buildings via a new
  building `role` field (`producer|caphouse|utility|landmark`) + `max:` (War
  Tent/Trading Post/Totem→`max:1`; Lookout→small max w/ DR; Great Hall already
  `max:1`); (3) **steep tier-transition costs + landmark gates** (`GG.BREAKTHROUGHS`
  — Breach the Surface→Era 2, Stoke the Furnaces→Era 3; readable tier names so
  **Great Hall = Large Village→Town**); owned-breakthrough set → sanitize+migrate;
  (4) **scale upkeep with size** + **soften `globalMult`** (lower milestone `mult`s
  to ~×50–100 total, or dampen with an exponent <1). Apply the **60–120 min pacing
  knobs**.
- **Note:** re-pins the F2 rate tests (expected churn — replace with the new finite
  curve).
- **Accept:** producer output no longer scales unbounded with count; utility
  buildings refuse builds past `max`; a tier crossing shows a real cost jump;
  upkeep scales; a scripted run reaches the finale in ~60–120 min; sanitize/migrate
  for breakthroughs; `tests/test-balance.js`.

### F8 — Refinement chain (Ash / Iron / Grit)  *(balanced within F7)*
- **Scope:** new `ash`/`iron` resources; a Smelter converter (scrap+ash→iron via a
  `convert:` effect in `Game.rates`); **Grit** mechanical upkeep supplementing food
  upkeep once Era 2 opens; Era-2 builds consume iron. newState/sanitize/migrate;
  keep F7 caps/DR + escalation working over the new resources (reuse the brewery's
  negative-`prod` precedent, data.js:185).
- **Accept:** scrap+ash refine to iron; Era-2 builds gate on iron; Grit can be
  starved/recovered; chapters reachable; `tests/test-refine.js`.

### W1 — Era-3 macro-map (territorial control)  *(large; late)*
- **Scope:** claimable territories over `GG.FACTIONS` + `s.standing`; spend
  iron/shinies to push borders; holdings feed renown → Legend (L2) and gate the
  geopolitical Reckoning (E5). `s.territory` → full sanitize. Interleaves with T5 +
  E5; L4 still resolves the Saga.
- **Accept:** territories claim/contest over time; holdings affect renown/standing
  + feed Legend; sanitize/migrate; `tests/test-territory.js`.

### Heroic ending  *(folds into E6)*
- 5th `GG.ENDINGS` — **Savior** (defeat a larger threat with goblin industry: high
  iron/territory + openness/defense, low cruelty) + its E6 epilogue.

## Step 3 — Re-sequenced build order (insertions only)

```
Task 0 (tests → repo)  +  Step-1 docs
→ A1  (render & loop hardening — fixes the click bugs)
→ F4  (typed/colored chronicle)
→ C1  (lore compose engine)   → N1 (evolving notable titles)
→ F6  (era model + metamorphosis)
→ F7  (economy rebalance + caps + gates + pacing)   ← PULLED FORWARD
→ E3 → E4 → L1 → L2 → L3       (the loop — unchanged spine; richer events use C1)
→ F8 (refinement) → F5 (vista) → L4 (Saga finale)
→ T1.x → E5 (+ W1 macro-map) → … → E6 (+ Heroic) → T5 (wars) → …
```

## Guardrails (non-negotiable)
- Strict CSP; no new external resources/inline handlers/`eval`; vanilla JS, no
  runtime deps (JSDoc/`@ts-check` + `node:test` are dev-only, zero-dep).
- `sanitizeState()` stays the single trust boundary — every new field (`s.eraSeen`,
  breakthroughs, chronicle `kind`, notable `title`/`titleTier`, `ash`/`iron`/
  `grit`, `s.territory`) defaulted, coerced/bounded, unknown/`__proto__` dropped,
  migrated, test-covered. Move `buyAmt` out of persisted state (A1).
- data→`data.js`, narrative→`story.js`, logic→`game.js` (no DOM), render + one
  delegated handler→`ui.js`. New systems are `tickX(s, dt)`.
- Tests: in-repo `tests/` (`node:test`), whole suite green before shipping. Ship to
  dev branch `claude/push-bundle-gobblelife-rqw28z` (Pages default); sync `main`
  via merged PR.

## Verification
- **Per phase:** full in-repo suite (relocated 297 assertions minus re-pinned F2
  tests) + the new `test-render/chronicle/compose/notable-identity/era/balance/
  refine/territory.js`; all green.
- **Click-bug regression:** a tap immediately changes the headline; a scripted
  "render-during-press" check confirms no dropped `data-act` click.
- **Balance sanity:** scripted full run finishes in ~60–120 min; an infinite-build
  test confirms producer output is bounded and utility buildings cap.
- **Browser smoke** (Chromium at `/opt/pw-browsers/chromium-1194/chrome-linux/
  chrome`): Oracle teal; UI reskins per `Game.era`; capped building disables at
  max; rapid tapping keeps the number in sync; no CSP violations.
- **Save-compat:** load a pre-existing save → migrate adds new fields safely,
  legacy chronicle→`'world'`, no retroactive era/milestone banners.

## Files touched (representative)
- `docs/REDESIGN.md`, `docs/ROADMAP.md` (now single-cycle task cards), `tests/`
  (relocated + new), `package.json` (`npm test`, dev-only).
- `js/data.js` — CONFIG (pacing, upkeep), RESOURCES (+ash/iron), building
  `role`/`max`/`growth` + `GG.BREAKTHROUGHS`, softened `MILESTONES`, ENDINGS
  (+Savior), notable + lore pools, era cut points.
- `js/game.js` — `Game.era`; `Game.rates` (DR, scaled upkeep, converter); softened
  `globalMult`; `chronicle(s,msg,kind)`; notable title evolution; `s.territory`;
  fixed-step tick; `newState`/`sanitizeState`/`migrate` for every new field;
  `@ts-check` + state `@typedef`.
- `js/story.js` — `Story.compose` engine + tagged pools; `Story.notableTitle`;
  per-`kind` tagging.
- `js/ui.js` — dirty-flag render scheduler; tap-snap; `#app` era class + per-era
  render; chronicle `kind`→colors + moment-cards; rich titles; cap/refinement/
  territory panels; `buyAmt` moved to UI state.
- `js/main.js` — rAF render + fixed-timestep sim accumulator (replaces the two
  `setInterval`s).
- `css/style.css` — `.era-1/2/3` palettes; chronicle kind colors (Oracle teal …).
```
