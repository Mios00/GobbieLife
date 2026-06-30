# GobbieLife — Adventure & Living World Roadmap

A phased plan to grow GobbieLife from a warren idle-builder into a living fantasy
world: an **adventure pathway**, **per-faction reputation**, **inbound threats
(duels & wars)**, and **world news / disasters**.

> **For future sessions:** this file holds the detailed task scopes. The
> **vision & sequencing** now live in [`REDESIGN.md`](./REDESIGN.md) (agreed
> 2026-06-30). Target: a **finishable, hours-to-days narrative roguelite-idle** —
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

**Done:** T0.1 ✅ · T0.2 ✅ · T0.3 ✅ · E1 ✅ · E2 ✅ · F1 ✅ · F2 ✅ · F3 ✅

1. [x] **F1** — Juice layer (floating `+N`, count-ups, milestone fanfares) ✅
2. [x] **F2** — Curated-exponential rework (milestone production multipliers, magnitude tiers, tap scaling) ✅
3. [x] **F3** — Next-goal tracker + onboarding ✅
4. [ ] **F4** — Story-delivery split (Saga vs World; moment-cards + banners)
5. [ ] **E3** — Hold (grip) + succession  *(heir now also feeds L1)*
6. [ ] **E4** — The Reckoning content + the Final Choice  *(the climax of one life)*
7. [ ] **L1** — Succession / reincarnation (world persists; bounded to `sagaLives`; replaces the wipe)
8. [ ] **L2** — Legend meta-currency (banked at succession)
9. [ ] **L3** — The Legend tree (small, finite — ~6–10 meta-upgrades)
10. [ ] **F5** — Vista accretion + building ASCII art  *(juice polish; can slot earlier)*
11. [ ] **L4** — The Saga's finale (the Bargain resolves after the final life → true ending)
12. [ ] **T1.1–T1.3** — Adventure v1 (zones → expeditions → party/risk)
13. [ ] **E5** — Destiny climaxes + recurring cast (the Mirror, the Witch, origin payoff)
14. [ ] **T2.1–T2.2** — Heroes: XP/levels, equipment & inventory
15. [ ] **T3.1–T3.2** — Adventure expansion (higher zones, beasts & bosses)
16. [ ] **E6** — Immortality pacts + endings + epilogues  *(also: refuse-succession alt prestige path)*
17. [ ] **T4.1–T4.2** — Inbound threats (notoriety, adventurer duels)
18. [ ] **T5.1–T5.3** — Wars (defense, declarations, sieges)
19. [ ] **T6.1–T6.2** — Disasters & world-sim polish
- *Slot in when convenient:* **T2.3** (adventure materials), **T3.3** (rich loot tables).

> **E7 (dynasty) is absorbed into Pillar 3 / L1–L4** — no longer a stretch goal; it
> is the spine. Detailed `E*`/`T*` scope/acceptance lives in the phase sections below.

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
  - Scope: the 5 immortality pacts (Witch/Mournhollow/Ssirvax/Aelinvar/become-the-Oracle), the secret **Tale Untold**, and **epilogues** assembled from run state (factions' fates, surviving notables, heir's nature, city tier, Silliness). The become-the-Oracle pact should canonically explain the Oracle voice.
  - Accept: each immortality ending reachable + gated; secret ending gated; epilogue reflects specifics; tests.
  - Deps: E4, E5.
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
