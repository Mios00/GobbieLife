# GobbieLife — Adventure & Living World Roadmap

A phased plan to grow GobbieLife from a warren idle-builder into a living fantasy
world: an **adventure pathway**, **per-faction reputation**, **inbound threats
(duels & wars)**, and **world news / disasters**.

> **For future sessions:** this file is the source of truth for what to build
> next. Pick the **first unchecked task** whose dependencies are all checked,
> implement it end-to-end (data + logic + UI + tests), tick its box, and append
> a one-line note under it. Keep tasks one-cycle-sized; if a task feels bigger
> than a single session, split it and update this file.

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
   `Despised → Distrusted → Tolerated → Respected → Trusted → Allied`. Drives
   trade, who duels you, who marches to war, and which zones are safe.

### Round-two defaults (adjustable)
- **War:** multi-stage *defendable event*; outcome weighted by defense strength.
- **Disasters:** mostly overheard flavor; a subset are opt-in opportunities/consequences.
- **Adventure cadence:** real-time expeditions (minutes), like longer zoned raids.
- **Death stakes:** permadeath possible (gear lost or inherited); most outcomes are wounds.

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

---

## Phase 0 — World foundation  *(enables everything)*

- [ ] **T0.1 — Factions data model & standing**
  - Goal: a world of named factions and a per-faction standing meter.
  - Scope: `GG.FACTIONS` in data.js — e.g. `{ id, name, kind ('human'|'dwarf'|'elf'|'beast'|'goblin'), baseStanding }` (a couple human kingdoms, a dwarven hold, an elven court, the beast-wilds, a rival warren). `s.factions = { id: standing(-100..100) }`. `Game.standing(s,id)`, `Game.standingTier(value)` → name. `Game.adjustStanding(s,id,delta)`. Defaults + `sanitizeState` coercion (known faction ids only, clamp) + migrate.
  - Accept: tests for default standings, tier thresholds, clamp, sanitize of crafted values; no UI required.
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
- _(append: date — task id — one line, as tasks are completed)_
