# GobbieLife — Redesign: A Narrative Roguelite-Idle Saga

> **Status:** design direction agreed 2026-06-30. This document is the *vision &
> sequencing* companion to `ROADMAP.md` (which holds the detailed task scopes).
> When the two disagree on **order**, this file wins; for **task detail**, the
> phase sections in `ROADMAP.md` win.

> **Target play length: hours-to-days, finishable.** GobbieLife is a **narrative
> roguelite-idle** — *not* an endless incremental. A single life is a ~30–90 min
> authored arc; the full **Saga** is a small, fixed number of lives (**3–5**)
> that **resolves into a true meta-ending**. We deliberately do **not** chase
> weeks-scale retention: the moat is hand-authored writing, and a weeks-long
> treadmill would force number-grind + procedural repetition that dilutes exactly
> that — and keep the satisfying ending forever receding. Replay value comes from
> **authored variety** (4 destinies × Silliness × heir × ending branches), not
> grind.

## The problem this solves

GobbieLife today is a beautifully *written* narrative toy wearing an idle game's
costume. The prose (especially the dual-register Silliness Index) is the moat.
But the mechanical engine an idle game needs is missing:

1. **No dopamine loop** — clicks/builds give tiny flat numbers with zero feedback.
2. **Linear, small scale** — never escalates by orders of magnitude.
3. **No meta-progression** — a single linear run with a hard ending can't sustain
   days-to-weeks of play.
4. **Story is an undifferentiated firehose** — a profound portent reads the same
   as "two goblins fight over a button."
5. **Mid-game goes passive** — once goblins are assigned, you just watch.
6. **Agency is unmoored** — destinies drift invisibly; the Oracle refuses all
   feedback, so choices don't *feel* like they matter.

## Design decisions (locked 2026-06-30)

- **Run length → a bounded reincarnation Saga (hours-to-days).** Each goblin life
  is ONE authored arc (~30–90 min) that ends satisfyingly; then you reincarnate /
  pass to an heir. The world persists; permanent **Legend** bonuses carry
  forward. The Saga is a **fixed ~3–5 lives**, after which the Bargain resolves in
  a **true meta-finale**. Many endings along the way, each meaning more — and a
  real finish line.
- **Scale → Curated exponential.** Orders-of-magnitude growth, but legible and
  themed via **named magnitude tiers**. Grand *and* readable.
- **Platform → Desktop, active sessions.** Invest in *more to do while watching*,
  not in mobile/offline. Offline accrual stays a courtesy, not the point.
- **Visual → Juice up the ASCII.** Keep pure text/ASCII + strict CSP. Add
  feedback: floating numbers, count-ups, fanfares, building art, animation. No
  external assets.

---

## The keystone reframe: **mortality *is* prestige**

The prestige engine is already ~80% built:

- **E2** gave the protagonist a `lifespan` and the Comet a countdown (the two
  clocks). **E1** turned the finale into a staged **Reckoning**. **E3** (next)
  adds an **heir** chosen from notables.

Today: death/comet/Great Hall → Reckoning → ending → **full wipe**. We change one
thing: the end of a life becomes **Succession, not a wipe**.

```
            ┌─────────────────────────────────────────────┐
            │  ONE LIFE  (an authored arc, hours → a day)  │
            │  grow ▸ build ▸ raid ▸ choose ▸ age          │
            └───────────────┬─────────────────────────────┘
                            │  death / comet / Great Hall
                            ▼
                    THE RECKONING (E1/E4)  ──▸  the Final Choice
                            │
                            ▼
                    BANK  ✦ LEGEND  (from renown · city tier ·
                            │         factions allied · deeds · ending)
                            ▼
        ┌──────────── SUCCESSION (L1) ───────────────┐
        │ • world PERSISTS: city tier, faction        │
        │   standings (decayed), discoveries,         │
        │   notable bloodlines                        │
        │ • reincarnate as the HEIR (E3) or new runt  │
        │ • age resets; a fresh personal arc begins   │
        │ • spend ✦ Legend on the LEGEND TREE (L3)    │
        │ • the Bargain / Witch spine advances (L4)   │
        └──────────────────┬──────────────────────────┘
                           ▼
                    NEXT LIFE  (stronger start, deeper world)
                           ┊
                  …after the FINAL life (3–5):
                           ▼
              THE SAGA'S TRUE FINALE (L4) — pay / break /
              turn the Bargain. A real ending. The game finishes.
```

Why this is the right spine:

- It makes **every shipped system load-bearing**: mortality = prestige trigger,
  succession/heir = who you become, factions/notables = persistent world, the
  Reckoning = the banking moment.
- It resolves the **authored-ending vs. endless-idle** tension: you get *many*
  authored endings, and each reincarnation makes the next ending land harder.
- It turns the **Bargain** (the Witch's deal for "more") into a *compounding*
  meta-story — the price grows each life, which is thematically perfect.
- **It's bounded, so it actually ends.** Because the Saga is a fixed ~3–5 lives,
  the meta-story has a real climax (L4) and the player *finishes* a tale rather
  than abandoning a treadmill. This also removes the riskiest, least-fun work
  (infinite exponential balancing, endless prestige tuning) entirely.

---

## The six pillars

### Pillar 1 — Escalation (curated exponential, bounded)
*Goal: numbers grow by orders of magnitude **within a life**, stay legible, feel
grand — without an infinite treadmill. Each life spans a few named magnitude
tiers; the Legend tree lifts the **starting** tier of later lives. We tune for a
finite curve, not endless scaling.*

- **Multiplicative buildings.** Replace flat `+0.5/s` with multipliers and
  scaling base output, so each level visibly *matters*. Global multipliers stack.
- **Named magnitude tiers** for display: render `1,240,000 ◈` as **"a Hoard
  (1.2M)"**. Bands (themed): *a handful → a pouch → a chest → a hoard → a
  dragon's hoard → a kingdom's ransom → a god's ransom*. Keeps big numbers
  readable and on-brand.
- **Milestone multipliers.** Every 10/25/50/100 of a building or population grants
  a one-off global ×2 ("the warren has never been so productive") — escalation +
  juice + a story beat in one.
- **Tap upgrades.** Manual actions scale (via buildings/Legend) so clicking stays
  relevant past the first minute.

### Pillar 2 — Juice (the feedback layer)
*Goal: every action and milestone is felt, not just registered.*

- Floating `+N` on clicks and threshold ticks; **count-up** number transitions;
  panel-glow / bar-pulse on change.
- **Milestone fanfare banners** ("⚑ The warren swells to 50 strong!").
- **Building-specific ASCII glyphs** that *accrete into the settlement vista* —
  the vista shows the *actual* structures you built, not 7 fixed frames.
- Strictly CSS animation + DOM; CSP unchanged; works from `file://`.

### Pillar 3 — The Legacy Loop (bounded prestige core)
*Goal: the hours-to-days engine. Promotes the old "E7 dynasty" stretch to spine —
but **bounded to a fixed ~3–5-life Saga with a real finale**, not endless.*

- **Succession on end-of-life** — world persists, age resets, reincarnate as heir
  or new runt. The **Saga length is fixed** (`CONFIG.sagaLives`, default 4); the
  final life ends in the meta-finale instead of another reincarnation.
- **Legend** meta-currency, banked from the life's achievements.
- **The Legend tree (small & finite)** — ~6–10 permanent upgrades that ease each
  successive life (production %, start-with-unlocks, caps, heir inherits gear,
  faction goodwill floor, +offline cap). Sized so a full Saga can buy *most* of
  it, not an infinite grind.
- **The Saga's true finale** — after the final life's Reckoning, the Bargain/Witch
  storyline **resolves** (pay / break / turn it). This is the headline ending, not
  a footnote. A between-lives "legacy" screen frames each new arc and the count
  ("Life III of IV").

### Pillar 4 — Story delivery (hierarchy & pacing)
*Goal: enjoy the lore without overwhelm; never miss the big beats.*

- Split the Chronicle into two registers:
  - **The Saga** — *your* beats (chapter heralds, twilight/comet portents,
    Reckoning, major deeds, faction-tier milestones): emphasized **moment-cards**,
    optionally a brief banner so they can't be missed.
  - **The World** — ambient flavour, world news, notable squabbles: a quieter,
    dimmer ticker.
- Pace density to activity: quiet when idle, rising through the Reckoning.

### Pillar 5 — Active engagement (desktop, in-session)
*Goal: things worth doing while you watch.*

- **Interactive notables** — assign a notable to boost a building, promote to
  heir, or send on an adventure. The roster becomes a *control surface*.
- The **adventure track** (existing T1.x) — send parties, real-time, resolve.
- A light **tap/combo** loop and occasional time-limited click events for engaged
  play.

### Pillar 6 — Clarity & onboarding
*Goal: always know the next goal; agency that's felt.*

- A **next-goal tracker** ("◷ 2/4 goblins → Chapter II") that surfaces the
  currently-invisible chapter requirements.
- A gentle guided first 5 minutes.
- A **directional, non-numeric destiny hint** after the Totem ("your legend leans
  toward the open road") — keeps the Oracle's mystery while giving the player a
  goal-gradient. The compromise between "hidden destiny" and "choices feel
  impactful."

---

## Amended build order

Principle: **make one life fun → make it loop → then add breadth.** New phases
**F** (Foundations of Fun) and **L** (Legacy Loop) are front-loaded; the existing
world track (`T*`) and remaining story track (`E*`) follow, re-centered on the
loop. Detailed scopes for `E*`/`T*` remain in `ROADMAP.md`.

1. **F1 — Juice layer.** ✅ Floating `+N`, count-ups, button-press feedback,
   milestone fanfare banners (`GG.MILESTONES`). *(Shipped 2026-06-30.)*
2. **F2 — Curated exponential rework.** ✅ Milestone production multipliers
   (`Game.globalMult`), named magnitude tiers (`Game.magnitude`), tap scaling.
   Derived from `s.milestones` (no new state). *(Shipped 2026-06-30. A deeper
   per-building multiplicative re-balance is deferred to a focused tuning pass —
   the milestone ladder already delivers the orders-of-magnitude escalation
   without touching pinned base rates.)*
3. **F3 — Next-goal tracker + onboarding.** Surface chapter reqs; guided opening.
4. **F4 — Story-delivery split.** Saga vs World; moment-cards + banners; pacing.
5. **E3 — Hold (grip) + succession.** *(Already next; the heir now also feeds L1.)*
6. **E4 — The Reckoning content + the Final Choice.** The climax of one life.
7. **L1 — Succession / reincarnation.** End-of-life → world persists, age resets,
   reincarnate as heir/new runt. *(Replaces the full wipe.)*
8. **L2 — Legend currency.** Banking formula from the life's achievements; HUD.
9. **L3 — The Legend tree.** Permanent meta-upgrades spent between lives.
10. **F5 — Vista accretion + building ASCII art.** *(Juice polish; can slot earlier.)*
11. **L4 — The Saga's finale.** The Bargain/Witch advances per reincarnation and
    **resolves after the final life** (the true meta-ending); between-lives legacy
    screen + Saga counter.
12. **T1.1–T1.3 — Adventure v1.** Zones → expeditions → party/risk model.
13. **E5 — Destiny climaxes + recurring cast** (the Mirror, the Witch, origin payoff).
14. **T2.x — Heroes: XP, levels, gear.**
15. **T3.x — Adventure expansion** (higher zones, beasts & bosses, loot).
16. **E6 — Immortality pacts + endings + epilogues** (now also *alternate prestige
    paths*: refuse succession, become deathless — a different meta-loop).
17. **T4.x — Inbound threats** (notoriety, adventurer duels).
18. **T5.x — Wars** (defense, declarations, sieges).
19. **T6.x — Disasters & world-sim polish.**

> Re: the old E7 (dynasty) — **absorbed into Pillar 3 / L1–L4.** It is no longer a
> stretch goal; it is the spine.

---

## New phase detail

### Phase F — Foundations of Fun *(front-loaded)*

- **F1 — Juice layer**
  - Scope: a small `UI.fx` helper (floating text spawn, count-up tween, glow
    pulse) driven off state deltas; milestone-banner queue. Hook clicks (`manual`,
    `build`, raid resolve) and threshold crossings.
  - Accept: clicks spawn `+N`; resource values tween; a milestone fires a banner
    exactly once; respects reduced-motion; no CSP/`file://` regressions; tests for
    the milestone-once logic.
- **F2 — Curated exponential rework**
  - Scope: building output → multiplicative + scaling base; global multiplier
    accumulator; `fmtMagnitude(n)` → named tier; milestone ×2 hooks; rebalance
    `CONFIG`/`BUILDINGS`/`JOBS`. Migrate saves (values are already nonneg numbers).
  - Accept: production grows by orders of magnitude across a run; display reads as
    named tiers; milestones grant a persistent ×2; full re-balance keeps chapters
    reachable; tests for `fmtMagnitude`, multiplier stacking, milestone idempotency.
- **F3 — Next-goal tracker + onboarding**
  - Scope: derive the current/next chapter requirement and render a compact
    progress line; a few first-run guidance hints that retire once acted on.
  - Accept: tracker shows the right next requirement and progress; hints retire;
    tests for requirement derivation.
- **F4 — Story-delivery split**
  - Scope: tag chronicle entries with a `kind` (`saga` | `world`); render Saga
    beats emphasized (+ optional transient banner) and World beats dimmed; keep
    the existing scroll-preserve dedup. Migrate legacy entries to `world`.
  - Accept: saga vs world visually distinct; big beats surface a banner once;
    scroll-lock behaviour preserved; tests for tagging + dedup.
- **F5 — Vista accretion + building ASCII art**
  - Scope: per-building ASCII glyph; compose the vista from *built* structures
    (fallback to the current tiered frames when sparse). Reuse settlement tiers
    for layout density.
  - Accept: building something changes the vista to include it; escaping intact;
    tests for composition.

### Phase L — The Legacy Loop *(the prestige core; absorbs old E7)*

- **L1 — Succession / reincarnation**
  - Scope: at end-of-life (Final Choice resolved, or death/comet without a
    deathless pact), instead of wiping: snapshot a **persistent world** (city
    tier, faction standings decayed toward base, discoveries, notable bloodlines),
    reset the *personal* arc (age/lifespan/comet re-rolled, resources/buildings per
    Legend-tree start bonuses), and reincarnate as the heir (E3) or a new runt.
    New `s.life` counter (1-indexed) and `CONFIG.sagaLives` (default 4); `s.world`
    persistent sub-object. **On the final life** (`s.life >= sagaLives`),
    end-of-life routes to the Saga finale (L4) instead of another succession.
  - Accept: ending a non-final life starts a new one in the same world (personal
    state resets, world state carries with decay); the final life routes to the
    finale, not a reincarnation; fully sanitized/migrated (new trust surface!);
    tests for persistence + reset + decay + the final-life branch.
  - Deps: E3 (heir), E4 (Final Choice), E2 (clocks).
- **L2 — Legend currency**
  - Scope: `s.legend` (lifetime, persistent); `Game.legendEarned(s)` from renown,
    settlement tier, factions ≥ Respected, deeds/achievements, and the ending
    reached; award at succession; show banked + this-life-earned in the HUD and
    the between-lives screen.
  - Accept: Legend banks deterministically from a life; HUD shows it; tests for
    the formula + monotonic banking.
  - Deps: L1.
- **L3 — The Legend tree (small & finite)**
  - Scope: `GG.LEGEND` — **~6–10** upgrade defs (production %, start-with-
    breeding/raids, cap+, faster breeding, heir keeps gear, faction goodwill
    floor, +offline cap) bought with `s.legend`; a between-lives **Legacy screen**
    to spend; effects applied in `newState`/`rates`. Curve sized so a full Saga
    buys *most* of the tree — generous, finite, not a grind.
  - Accept: upgrades purchasable, persist, and measurably change the next life;
    sanitize/migrate the owned-upgrade set (known ids only); tests for
    purchase-gating + effect application.
  - Deps: L2.
- **L4 — The Saga's finale (Bargain resolves)**
  - Scope: the Bargain/Witch storyline advances by `s.life` (the Witch's price
    compounds; her appearances escalate across lives); the Legacy screen frames
    each new arc and shows the Saga counter ("Life III of IV"). **After the final
    life's Reckoning, the Bargain resolves** — a climactic meta-choice (pay /
    break / turn it) gated by cumulative deeds/destiny/Legend → the **true
    ending**. Founder lives are recorded as remembered legends in the epilogue.
  - Accept: the meta-story visibly progresses each reincarnation; the final life
    triggers the resolution; the meta-choice offers only earned options and
    resolves to a distinct true ending; prior founders referenced;
    earnest+silly; tests for life-indexed selection + finale gating/resolution.
  - Deps: L1, E5 (cast), E6 (ending/epilogue assembly).

---

## Guardrails (unchanged, non-negotiable)

- **Security:** strict CSP; `sanitizeState()` stays the single trust boundary —
  **every** new persistent field (especially the new `s.world`, `s.legend`,
  `s.life`, owned-upgrade sets) must be defaulted, type/range-coerced, unknown
  keys dropped, and test-covered. All dynamic text via `esc()`. No inline
  handlers, no external requests, no `eval`.
- **Architecture:** data in `data.js`, narrative pools in `story.js`, logic in
  `game.js` (no DOM), render + one delegated handler in `ui.js`, boot in
  `main.js`. New systems are `tickX(s, dt)` from `Game.tick`.
- **Tests:** Node + `vm` harness; each system gets `test-<system>.js`; whole suite
  green before shipping.
- **Ship:** dev branch `claude/push-bundle-gobblelife-rqw28z` (Pages default);
  sync `main` via merged PR.

## Open questions for later (not blocking F1)
- **Saga length** (`CONFIG.sagaLives`, default 4) and the per-life target duration
  (~30–90 min) — playtest and tune during L1/L4.
- **Legend-tree curve** — ~6–10 upgrades; tune steepness in L3 so a full Saga buys
  most of it.
- Does the heir's *personality* (trait) mechanically shape the next life, or just
  flavour it? (Leaning: a small mechanical lean + strong flavour.)
- Immortality pacts (E6) as a *refusal* of succession — ending the Saga early on a
  lonelier, deathless note. Design when we reach E6.
