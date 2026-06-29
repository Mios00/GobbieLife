# GobbieLife — Adventure & Living World Roadmap

A phased plan to grow GobbieLife from a warren idle-builder into a living fantasy
world: an **adventure pathway**, **per-faction reputation**, **inbound threats
(duels & wars)**, and **world news / disasters**.

> **For future sessions:** this file is the source of truth for what to build
> next. Follow the **Blended build order** below (it already interleaves the
> world track `T*` and the story track `E*`) — take the first unchecked item
> whose dependencies are met, implement it end-to-end (data + logic + UI +
> tests), tick its box, append a one-line note, and add a changelog entry. Keep
> tasks one-cycle-sized; if a task feels bigger than a single session, split it.

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
- **Tests:** Node + `vm` harness with stubbed `document`/`localStorage` (see
  `scratchpad/test-*.js`). Each system gets a `test-<system>.js`. Run the whole
  suite before shipping; keep all green.
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

## Blended build order  *(the world track `T*` and story track `E*`, interleaved)*

This is the recommended single sequence. The two tracks are **not** done one after
the other — story is woven through world-building so the finale grows alongside the
world it pays off. (Dependencies in each task still apply; this order respects them.)

1. [x] **T0.1** — Factions, standing & gradual discovery ✅
2. [ ] **T0.2** — Standing panel + deeds move standing
3. [ ] **T0.3** — World news feed (flavor; also a discovery vector)
4. [ ] **E1** — Finale → multi-act Reckoning scaffold  *(restructure the endgame early)*
5. [ ] **E2** — Protagonist mortality + the two clocks
6. [ ] **E3** — Hold (grip) + succession
7. [ ] **T1.1** — Adventure zones + panel scaffold
8. [ ] **T1.2** — Expeditions (send party, real-time, resolve)
9. [ ] **T1.3** — Party strength & risk model
10. [ ] **E4** — The Reckoning content + the Final Choice  *(mortality + adventure now give it stakes)*
11. [ ] **T2.1** — Hero progression (XP & levels)
12. [ ] **T2.2** — Equipment & inventory
13. [ ] **T3.1** — Higher zones gated by standing
14. [ ] **T3.2** — Beasts & bosses
15. [ ] **E5** — Destiny climaxes + recurring cast (the Mirror, the Witch, origin payoff)
16. [ ] **T4.1** — Notoriety meter
17. [ ] **T4.2** — Adventurer challengers (duels)
18. [ ] **T5.1** — Defense layer
19. [ ] **T5.2** — War declarations
20. [ ] **T5.3** — Siege resolution
21. [ ] **E6** — Immortality pacts + endings + epilogues  *(capstone, once threats/wars exist)*
22. [ ] **T6.1** — Disasters with consequences
23. [ ] **T6.2** — World simulation polish
24. [ ] **E7** — (stretch) Dynasty / generational continuation
- *Slot in when convenient:* **T2.3** (adventure materials), **T3.3** (rich loot tables).

> Detailed scope/acceptance for each item lives in its phase section below.

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

- [ ] **E1 — Finale → multi-act Reckoning (scaffold)**
  - Goal: the Great Hall *triggers* an endgame act instead of ending instantly.
  - Scope: `s.endgame = { active, stage, started }`. Building the Great Hall (or a path monument) sets `unlocks.finale` and **begins The Reckoning** — a staged sequence (`tickReckoning` or chapter-acts VII+) that advances through beats and ends by calling the (relocated) `Game.finish`. Keep a placeholder 2–3 stage sequence for now; E4/E5 fill it with content.
  - Accept: building greatHall no longer ends the game immediately; an endgame state starts, advances through stages, and only *then* resolves to an ending; save/sanitize/migrate for `s.endgame`; tests.
  - Deps: none.
- [ ] **E2 — Protagonist mortality + the two clocks**
  - Goal: you age and will die; the world has its own countdown.
  - Scope: `s.age`, `s.lifespan` (long, randomised; ages only during active play, not offline), `s.renown`. `s.comet` (long countdown seeded at start / by omens) surfaced via Oracle + news. As age nears lifespan, a "twilight" pressure; protagonist death with no succession plan force-triggers the Reckoning/an ending.
  - Accept: age advances, lifespan exists, comet counts down, both surfaced in UI; death is handled (not a silent stop); sanitize/migrate; tests.
  - Deps: E1.
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
- [ ] **T0.2 — Standing panel + deeds move standing**
  - Goal: see how each faction regards you; existing actions change it.
  - Scope: a `#standing` panel (faction + tier, color-coded). Wire raids/cruelty to lower nearby-faction standing, trade/mercy/welcoming-races to raise it. Start most factions at **Despised**.
  - Depends: T0.1.
  - Accept: panel renders known factions; a raid lowers the relevant standing; a trade raises one; escaped output; tests.
- [ ] **T0.3 — World news feed (flavor)**
  - Goal: the world feels alive; you overhear distant events.
  - Scope: `GG.WORLDNEWS` pool (disasters, far-off wars, festivals, faction doings) + `tickWorldNews` delivering a caravan/wanderer-framed Chronicle line on a cadence. Earnest + silly variants. Pure flavor for now.
  - Depends: none (can run alongside T0.1).
  - Accept: news lines appear on cadence; silly/earnest split honored; tests.

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
- 2026-06-29 — **Build order** — added a single Blended build order interleaving the world track (T*) and story track (E*); story is woven through, not appended after.
- 2026-06-29 — **Story design** — added the Story Bible (The Bargain spine, one-story-four-lenses, recurring cast, two clocks, the Final Choice, mortality & succession, become-the-Oracle, endings) and **Phase E** (E1–E7) endgame/story tasks.
- 2026-06-29 — **T0.1** — Factions data model (11 factions), per-faction standing + tiers, gradual discovery (chapter-driven for now), sanitize/migrate, 24 tests.
- _(append: date — task id — one line, as tasks are completed)_
