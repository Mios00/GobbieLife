/* ============================================================
 * game.js — state, simulation, persistence
 *
 * Owns the single source of truth (GG.state) and all the verbs
 * that change it. Knows nothing about the DOM — ui.js reads from
 * here and calls these functions.
 * ============================================================ */
(function () {
  const GG = (window.GG = window.GG || {});
  const C = GG.CONFIG;
  const Game = (GG.Game = {});

  // the two clocks, rolled fresh each tale: your lifespan and the Comet's.
  function freshMortality() {
    const ls = C.lifespanMinSec + Math.random() * C.lifespanVarSec;
    const ct = C.cometMinSec + Math.random() * C.cometVarSec;
    return { lifespan: ls, comet: { left: ct, total: ct, warned: 0 } };
  }

  // ---- fresh state ---------------------------------------------
  // `silliness` is the Silliness Index (0..1) the player sets before starting:
  // the probability that any narrative draw uses the silly/satirical register.
  function newState(silliness) {
    silliness = (silliness == null) ? 0.3 : Math.max(0, Math.min(1, silliness));
    const legend = GG.Story.makeLegend(silliness);
    const mort = freshMortality();
    return {
      version: 1,
      startedAt: Date.now(),
      lastSeen: Date.now(),
      silliness,
      name: legend.name,
      legendIntro: legend.intro.replace('#NAME#', legend.name),

      resources: { mushrooms: 0, scrap: 0, shinies: 0, ash: 0, iron: 0, grit: 0 },
      totals: { shiniesTotal: 0 }, // lifetime, for milestones

      population: 1,        // goblins (bred, job-assignable)
      peakPop: 1,           // highest TOTAL population ever (gates building reveals)
      races: { dwarf: 0, human: 0, elf: 0 }, // other races who've joined the tribe
      notables: [],         // named individual goblins (the roster)
      notableSeq: 0,        // id counter for notables
      standing: initStanding(),     // per-faction standing (-100..100)
      discovered: initDiscovered(), // which factions you've heard of (gradual)
      jobs: { forage: 0, dig: 0, raid: 0 },

      buildings: {
        mushroomPatch: 0, scrapHeap: 0, burrow: 0,
        warTent: 0, lookout: 0, tradingPost: 0, brewery: 0, totem: 0, greatHall: 0,
        scrapyard: 0, smelter: 0,
      },

      stats: { greed: 0, cruelty: 0, openness: 0, wanderlust: 0 },
      settle: 0,           // how "rooted" you are (from building)
      raidCount: 0,
      tradeCount: 0,
      buyAmt: 1,           // bulk-buy selector for buildings (1 | 10 | 'max')
      achievements: {},    // id -> true once earned
      milestones: {},      // id -> true once a scale-milestone fanfare has fired

      unlocks: { breeding: false, raids: false, trade: false, destiny: false, finale: false },

      chapter: 0,
      breedProgress: 0,
      raid: { active: false, returnsAt: 0, target: null },
      pendingChoice: null, // {title,text,options}

      chronicle: [],
      chronCount: 0,       // monotonic entry counter (UI dedup key)
      lastOracle: null,    // most recent Oracle riddle (shown in place of a destiny meter)
      endgame: { active: false, stage: 0, accum: 0 }, // The Reckoning (endgame act)
      age: 0,              // protagonist's age (seconds of active play)
      lifespan: mort.lifespan, // when old age claims you (active-play seconds)
      renown: 0,           // your growing legend
      twilight: 0,         // how many twilight portents have been told (0..2)
      comet: mort.comet,   // the Prophesied Year countdown (world doom)
      ending: null,        // set when game is finished
      eraSeen: {},         // which era transitions have bannered (keys: 2, 3)
      breakthroughs: {},   // which GG.BREAKTHROUGHS have fired (keyed by id)
      heir: null,          // id of designated successor notable (integer) or null
      resentment: 0,       // accumulated unrest (0–100); erodes hold
      log: [],             // short transient action feedback

      // Saga / Legacy (L1–L3)
      sagaLife: 1,         // current life within the Saga (1 … sagaLives)
      sagaLegend: 0,       // ✦ Legend banked (prior lives' earned; current life's added at Game.finish)
      sagaLegendEarned: 0, // ✦ Legend earned across the whole Saga (monotonic; gates the L4 finale doors)
      legendSpent: {},     // legend-tree upgrades purchased (id → true)
      founder: null,       // { name, endingId, endingName, lifeNum } from the previous life
      founders: [],        // every prior life's record, oldest first (the Saga's remembered legends)

      // Saga finale (L4) — the TRUE meta-ending, set only after the final life
      sagaEnding: null,    // { id, name, text } once the Bargain is resolved
    };
  }

  // ---- derived values ------------------------------------------
  Game.goblinCap = function (s) {
    let cap = 2;
    cap += s.buildings.burrow * (GG.BUILDINGS.burrow.capPlus);
    return cap;
  };

  Game.idleGoblins = function (s) {
    return s.population - s.jobs.forage - s.jobs.dig - s.jobs.raid;
  };

  // everyone who lives here: goblins + every other race that has joined
  Game.totalPop = function (s) {
    let t = s.population;
    for (const rc in (s.races || {})) t += s.races[rc] || 0;
    return t;
  };

  // how many goblins can stand out as "notables" — grows with the whole tribe,
  // but never exceeds the goblin count it's drawn from (capped at 8).
  Game.notableCap = function (s) {
    return Math.min(8, s.population, 2 + Math.floor(Game.totalPop(s) / 4));
  };

  Game.distinctBuildings = function (s) {
    return Object.values(s.buildings).filter((v) => v > 0).length;
  };

  // a building's option only appears once the tribe has PEAKED at revealPop
  // goblins — so the build menu unfolds gradually as the warren grows.
  Game.buildingRevealed = function (s, id) {
    const need = GG.BUILDINGS[id].revealPop || 0;
    return (s.peakPop || s.population || 1) >= need;
  };

  // diminishing returns for producer buildings: linear up to level 5, then each
  // additional level contributes only 60% as much (halves the late-game runaway).
  function drProd(lvl) {
    return lvl <= 5 ? lvl : 5 + (lvl - 5) * 0.6;
  }

  // production per second (net), plus a breakdown for the UI
  Game.rates = function (s) {
    const r = { mushrooms: 0, scrap: 0, shinies: 0, ash: 0, iron: 0, grit: 0 };
    // grit starvation: if current grit stock is negative, era-2 output is halved
    const gritStarved = (s.resources && (s.resources.grit || 0) < 0);
    // building passive — producers get DR; converters consume/produce per level;
    // era-2 buildings pay a fixed grit upkeep and may be penalized by starvation.
    for (const id in s.buildings) {
      const lvl = s.buildings[id] || 0;
      if (!lvl) continue;
      const def = GG.BUILDINGS[id];
      if (!def) continue;
      const isEra2 = def.requires === 'era2';
      const penalty = (isEra2 && gritStarved) ? 0.5 : 1;
      if (def.role === 'converter' && def.convert) {
        // consume from-resources at full rate; production is halved when starved
        for (const res in def.convert.from) r[res] -= def.convert.from[res] * lvl;
        for (const res in def.convert.to) r[res] += def.convert.to[res] * lvl * penalty;
      } else if (def.prod) {
        const eff = (def.role === 'producer') ? drProd(lvl) : lvl;
        for (const res in def.prod) {
          if (res === 'grit') r.grit += def.prod[res] * eff; // grit recovery never penalized
          else r[res] += def.prod[res] * eff * (isEra2 ? penalty : 1);
        }
      }
      if (isEra2) r.grit -= 0.1 * lvl; // fixed grit upkeep per era-2 building level
    }
    // assigned goblins
    r.mushrooms += s.jobs.forage * GG.JOBS.forage.perGoblin;
    r.scrap += s.jobs.dig * GG.JOBS.dig.perGoblin;
    // other races each contribute their specialty, passively
    for (const rc in (s.races || {})) {
      const def = GG.RACES[rc];
      const n = s.races[rc] || 0;
      if (def && n > 0) for (const res in def.bonus) r[res] += def.bonus[res] * n;
    }
    // curated-exponential escalation: scale ALL production by the global
    // multiplier earned from milestones (1 when none have fired — keeps early
    // balance, and every pinned-rate test, exactly as before).
    // ash/iron/grit are era-2 chains that operate outside the exponential curve.
    const mult = Game.globalMult(s);
    r.mushrooms *= mult; r.scrap *= mult; r.shinies *= mult;
    // Legend tree: +20% to all positive resource production (applied before upkeep)
    if (s.legendSpent && s.legendSpent.prod_boost) {
      for (const k of ['mushrooms', 'scrap', 'shinies']) {
        if ((r[k] || 0) > 0) r[k] *= 1.2;
      }
    }
    // upkeep — goblins and guests eat (NOT scaled); larger settlements also need
    // maintenance proportional to their tier (keeps big warrens from being free).
    r.mushrooms -= Game.totalPop(s) * C.upkeepPerGoblin;
    r.mushrooms -= Game.settlementTier(s) * (C.tierUpkeepPerSec || 0);
    return r;
  };

  // the global production multiplier: the product of every fired milestone's
  // `mult`. Derived purely from s.milestones (already a sanitized trust surface),
  // so this adds no new persistent state. 1 on a fresh tale.
  Game.globalMult = function (s) {
    let m = 1;
    for (const def of (GG.MILESTONES || [])) {
      if (s.milestones && s.milestones[def.id]) m *= (def.mult || 1);
    }
    return m;
  };

  // name the magnitude band a number falls in ("a Hoard"); highest at <= n.
  Game.magnitude = function (n) {
    const bands = GG.MAGNITUDES || [];
    let name = bands.length ? bands[0].name : '';
    for (const b of bands) if (n >= b.at) name = b.name;
    return name;
  };

  // cost to buy the next level of a building (returns map or null if maxed)
  Game.buildingCost = function (s, id) {
    const def = GG.BUILDINGS[id];
    const lvl = s.buildings[id];
    if (def.max && lvl >= def.max) return null;
    const cost = {};
    for (const res in def.base) {
      cost[res] = Math.ceil(def.base[res] * Math.pow(def.growth, lvl));
    }
    return cost;
  };

  Game.canAfford = function (s, cost) {
    if (!cost) return false;
    for (const res in cost) if (s.resources[res] < cost[res]) return false;
    return true;
  };

  // cumulative cost to buy `n` consecutive levels of a building, accounting
  // for the per-level growth. Returns { cost, count } where count may be less
  // than n if the building hits its max first.
  Game.buildingCostN = function (s, id, n) {
    const def = GG.BUILDINGS[id];
    let lvl = s.buildings[id];
    const cost = {};
    let count = 0;
    for (let i = 0; i < n; i++) {
      if (def.max && lvl >= def.max) break;
      for (const res in def.base) {
        cost[res] = (cost[res] || 0) + Math.ceil(def.base[res] * Math.pow(def.growth, lvl));
      }
      lvl++; count++;
    }
    return { cost, count };
  };

  // how many levels of `id` the player can currently afford (greedy, exact).
  Game.maxAffordable = function (s, id) {
    const def = GG.BUILDINGS[id];
    let lvl = s.buildings[id];
    const spent = { mushrooms: 0, scrap: 0, shinies: 0 };
    let count = 0;
    while (!(def.max && lvl >= def.max)) {
      const step = {};
      let ok = true;
      for (const res in def.base) {
        step[res] = Math.ceil(def.base[res] * Math.pow(def.growth, lvl));
        if (s.resources[res] < spent[res] + step[res]) { ok = false; break; }
      }
      if (!ok) break;
      for (const res in step) spent[res] += step[res];
      lvl++; count++;
      if (count > 9999) break; // safety
    }
    return count;
  };

  // each Lookout Warren multiplies the odds of bad outcomes / events down.
  Game.riskFactor = function (s) {
    return Math.pow(0.65, s.buildings.lookout || 0);
  };

  // ---- factions & standing -------------------------------------
  function initStanding() {
    const m = {}; for (const id in GG.FACTIONS) m[id] = GG.FACTIONS[id].baseStanding || 0; return m;
  }
  function initDiscovered() {
    const m = {}; for (const id in GG.FACTIONS) m[id] = !!GG.FACTIONS[id].startKnown; return m;
  }
  const clampStanding = (v) => Math.max(-100, Math.min(100, v));

  Game.standing = function (s, id) {
    const v = s.standing && s.standing[id];
    return Number.isFinite(v) ? v : (GG.FACTIONS[id] ? GG.FACTIONS[id].baseStanding : 0);
  };
  Game.standingTier = function (v) {
    const t = GG.STANDING_TIERS;
    let name = t[0].name;
    for (const tier of t) if (v >= tier.at) name = tier.name;
    return name;
  };
  Game.adjustStanding = function (s, id, delta) {
    if (!GG.FACTIONS[id]) return;
    if (!s.standing) s.standing = initStanding();
    s.standing[id] = clampStanding(Game.standing(s, id) + delta);
  };
  Game.isDiscovered = function (s, id) {
    return !!(s.discovered && s.discovered[id]);
  };
  Game.knownFactions = function (s) {
    return Object.keys(GG.FACTIONS).filter((id) => Game.isDiscovered(s, id));
  };
  // reveal a faction (idempotent). Returns true if newly discovered.
  Game.discoverFaction = function (s, id) {
    const f = GG.FACTIONS[id];
    if (!f || (s.discovered && s.discovered[id])) return false;
    if (!s.discovered) s.discovered = {};
    if (!s.standing) s.standing = initStanding();
    s.discovered[id] = true;
    if (!Number.isFinite(s.standing[id])) s.standing[id] = f.baseStanding || 0;
    chronicle(s, `Word reaches the warren of ${f.name} — ${f.rumor || ''}`.trim());
    return true;
  };
  // reveal one not-yet-known faction (used on chapter turns; later: exploration/news)
  function maybeDiscover(s) {
    const unknown = Object.keys(GG.FACTIONS).filter((id) => !(s.discovered && s.discovered[id]));
    if (unknown.length) Game.discoverFaction(s, pickOne(unknown));
  }

  // what the place LOOKS like now: 0 (a hole) … 6 (a city), derived from how
  // rooted you are, how built-up, and how big the tribe has grown.
  Game.settlementTier = function (s) {
    const score = s.settle + Game.distinctBuildings(s) + Math.floor((s.peakPop || s.population || 1) / 3);
    const cuts = [2, 5, 8, 12, 16, 21]; // boundaries between the 7 tiers
    let t = 0;
    for (const c of cuts) if (score >= c) t++;
    return t;
  };

  // Derives which of the three story Eras the settlement is in, purely from
  // the settlement tier — no new stored state. Era 1 Feral (0–1), Era 2 Iron
  // Hunger (2–4), Era 3 World Blight (5–6). UI uses this to reskin the palette.
  Game.era = function (s) {
    const t = Game.settlementTier(s);
    if (t <= 1) return 1;
    if (t <= 4) return 2;
    return 3;
  };

  // ---- hold (grip) — derived from cruelty, openness, renown, resentment ----
  // fear-component: cruelty (capped 50), loyalty-component: openness (capped 25),
  // deeds-component: renown (capped 15). Resentment erodes the total. 0–100.
  Game.holdScore = function (s) {
    const c = Math.min(50, (s.stats.cruelty || 0) * 0.5);
    const o = Math.min(25, (s.stats.openness || 0) * 0.25);
    const d = Math.min(15, (s.renown || 0) * 0.15);
    return Math.max(0, Math.min(100, c + o + d - (s.resentment || 0)));
  };

  Game.holdTier = function (s) {
    const h = Game.holdScore(s);
    if (h < 20) return 'Crumbling';
    if (h < 45) return 'Tenuous';
    if (h < 70) return 'Steady';
    return 'Iron Grip';
  };

  Game.nameHeir = function (s, id) {
    const nb = (s.notables || []).find((n) => n.id === id);
    if (!nb) return;
    const prevNb = s.heir != null ? (s.notables.find((n) => n.id === s.heir) || null) : null;
    s.heir = nb.id;
    if (prevNb) {
      chronicle(s, `${nb.name} ${nb.role} is named heir, replacing ${prevNb.name}. Loyalties in the warren shift like shadows.`, 'event');
    } else {
      chronicle(s, `${nb.name} ${nb.role} is named heir — the succession is no longer in doubt. The warren exhales as one.`, 'milestone');
      s.resentment = Math.max(0, (s.resentment || 0) - 10);
    }
  };

  Game.clearHeir = function (s) {
    if (s.heir == null) return;
    const nb = (s.notables || []).find((n) => n.id === s.heir);
    s.heir = null;
    if (nb) chronicle(s, `${nb.name} is released from the heir's mantle. The succession is once again uncertain.`, 'event');
  };

  // ---- next-goal tracker (clarity / onboarding) ----------------
  // Chapters advance on hidden requirements (data.js GG.CHAPTERS). Surface the
  // NEXT one as a concrete objective with progress, so the player always knows
  // what to chase. Purely derived from state — no new persistent field.
  const GOAL_META = {
    buildings:         { get: (s) => Game.distinctBuildings(s), label: (n) => `raise ${n} kind${n > 1 ? 's' : ''} of structure` },
    buildingsDistinct: { get: (s) => Game.distinctBuildings(s), label: (n) => `raise ${n} different structures` },
    population:        { get: (s) => s.population,              label: (n) => `grow the tribe to ${n} goblins` },
    shiniesTotal:      { get: (s) => Math.floor(s.totals.shiniesTotal), label: (n) => `earn ${n} shinies, all told` },
    settle:            { get: (s) => s.settle,                  label: (n) => `root the settlement to ${n}` },
    greatHall:         { get: (s) => s.buildings.greatHall,     label: () => `raise the Great Hall` },
  };
  // the objective for the chapter you're working toward, or null once the tale
  // has reached its final chapter (the Reckoning takes over from there).
  Game.nextGoal = function (s) {
    const ch = GG.CHAPTERS[s.chapter]; // s.chapter is how many are DONE → this is the next
    if (!ch || !ch.req) return null;
    let pick = null;
    for (const k in ch.req) {
      const meta = GOAL_META[k]; if (!meta) continue;
      const need = ch.req[k];
      const have = meta.get(s);
      const frac = need > 0 ? Math.max(0, Math.min(1, have / need)) : 1;
      if (!pick || frac < pick.frac) pick = { have: Math.min(have, need), need, frac, label: meta.label(need) };
    }
    if (!pick) return null;
    return { chapter: s.chapter + 1, title: ch.title, label: pick.label, have: pick.have, need: pick.need, frac: pick.frac };
  };

  // one gentle, contextual tip for the opening minutes; null once you've found
  // your feet (Chapter II onward), so it retires on its own without any flag.
  Game.onboardingTip = function (s) {
    if (s.chapter >= 2 || s.ending) return null;
    if (Game.distinctBuildings(s) === 0)
      return 'New here? Tap “Scrabble for mushrooms” and “Pry up scrap” to gather, then raise your first structure under Build.';
    if (!s.unlocks.breeding)
      return 'Raise a Burrow next — it lifts your goblin cap and lets the tribe start breeding on its own.';
    if (s.population < 4)
      return 'Keep mushrooms stocked and your goblins will breed. Assign idle goblins to Forage and Dig to grow faster.';
    return null;
  };

  // ---- verbs ----------------------------------------------------
  function note(s, msg) {
    s.log.unshift(msg);
    if (s.log.length > 4) s.log.length = 4;
  }
  // Valid chronicle kind values. Sanitize coerces anything else to 'world'.
  // Kept at module scope so sanitizeState can share the same allowlist.
  const CHRONICLE_KINDS = new Set(['oracle','milestone','portent','saga','world','combat','build','event']);
  function chronicle(s, msg, kind) {
    const k = CHRONICLE_KINDS.has(kind) ? kind : 'world';
    s.chronicle.push({ t: Date.now(), msg, kind: k });
    if (s.chronicle.length > 200) s.chronicle.shift();
    // monotonic count of every entry ever added — the UI keys its dedup on this
    // so a re-render is never skipped due to timestamp/text collisions, even at
    // the 200-entry cap where length stops changing.
    s.chronCount = (s.chronCount || 0) + 1;
    // saga beats are major narrative moments — queue a banner so they can't be missed.
    // pendingBanners is drained each tick by the boot loop into UI.fx.banner().
    if (k === 'saga') pendingBanners.push(msg);
  }
  Game.chronicle = chronicle;

  // a manual scrabble. Taps scale gently with your prosperity (sqrt of the
  // global multiplier) so clicking stays relevant past the opening minute
  // without trivialising it. Returns the amount gained (the UI floats it).
  Game.manual = function (s, kind) {
    const amt = Math.max(1, Math.ceil(Math.sqrt(Game.globalMult(s))));
    if (kind === 'forage') { s.resources.mushrooms += amt; note(s, '+' + amt + ' ' + GG.RESOURCES.mushrooms.sym); }
    else if (kind === 'dig') { s.resources.scrap += amt; note(s, '+' + amt + ' ' + GG.RESOURCES.scrap.sym); }
    else return 0;
    return amt;
  };

  Game.assign = function (s, job, delta) {
    if (delta > 0 && Game.idleGoblins(s) <= 0) return;
    if (delta < 0 && s.jobs[job] <= 0) return;
    if (job === 'raid' && !s.unlocks.raids) return;
    s.jobs[job] += delta;
  };

  // build one level. returns true on success.
  function buildOne(s, id) {
    const def = GG.BUILDINGS[id];
    if (def.requiresChapter && s.chapter < def.requiresChapter) return false;
    if (def.needs && !s.unlocks[def.needs]) return false;
    if (def.requires && !(s.breakthroughs && s.breakthroughs[def.requires])) return false;
    if (!Game.buildingRevealed(s, id)) return false;
    const cost = Game.buildingCost(s, id);
    if (!Game.canAfford(s, cost)) return false;
    if (def.ironCost && (s.resources.iron || 0) < def.ironCost) return false;
    for (const res in cost) s.resources[res] -= cost[res];
    if (def.ironCost) s.resources.iron = (s.resources.iron || 0) - def.ironCost;
    s.buildings[id] += 1;

    if (def.unlocks) s.unlocks[def.unlocks] = true;
    if (def.settle) s.settle += def.settle;
    if (def.lean) for (const k in def.lean) s.stats[k] += def.lean[k];

    // first-time-built gets a chronicle beat
    if (s.buildings[id] === 1) chronicle(s, firstBuildLine(id), 'build');
    if (id === 'greatHall') Game.beginReckoning(s); // begins the endgame act, not an instant end
    return true;
  }

  // build `count` levels (a number, or 'max'). returns how many were raised.
  Game.build = function (s, id, count) {
    const def = GG.BUILDINGS[id];
    let want = count === 'max' ? Infinity : (count || 1);
    if (def.max != null) want = Math.min(want, Math.max(0, def.max - s.buildings[id]));
    let built = 0;
    while (built < want && buildOne(s, id)) built++;
    if (built === 1) note(s, 'Built ' + def.name + '.');
    else if (built > 1) note(s, 'Built ' + def.name + ' ×' + built + '.');
    return built;
  };

  function firstBuildLine(id) {
    const lines = {
      mushroomPatch: 'You coax the first patch of mushrooms into rows. Farming. A goblin, farming. The mushrooms seem as surprised as you are.',
      scrapHeap: 'You start a proper scrap heap. Goblins arrive to admire it like art. It is, to them, art.',
      burrow: 'You dig new burrows. That night, for the first time, the warren is too crowded to feel alone.',
      warTent: 'You raise a war tent of hide and spite. The young goblins sharpen things. Something is coming, and it will be you.',
      lookout: 'You raise a lookout warren on the high rocks. For the first time, the dark holds fewer surprises. The sentries take their watch very, very seriously.',
      tradingPost: 'You prop up a trading post on the road. The first traveller flinches, then haggles. Commerce, it turns out, is louder than war and almost as fun.',
      brewery: 'You build a brewery and ferment the first batch of mushroom ale. It is vile. The tall folk adore it. Coin starts to trickle in while you sleep.',
      totem: 'You carve a totem that "remembers." Goblins tell it their day. It tells you your destiny, a little clearer each time.',
      greatHall: 'The Great Hall rises, beam by impossible beam. Every goblin you ever recruited stands in its shadow. This is the end of one tale and, you suspect, the start of a legend.',
      scrapyard: 'You organize the first proper salvage heaps. Ash begins to drift from the sorting fires. The industrial age has a smell to it — and goblins love smells.',
      smelter: 'The first Smelter lights. Scrap and ash go in. Iron comes out. The warren smells of hot metal for a week. Nobody complains.',
    };
    return lines[id] || 'Something new stands in the warren.';
  }

  // ---- breeding (passive population growth) --------------------
  function breedCost(s) {
    return Math.ceil(C.breedBaseCostMush * Math.pow(C.breedScale || 1.15, s.population - 1));
  }
  function tickBreeding(s, dt) {
    if (!s.unlocks.breeding) return;
    if (s.population >= Game.goblinCap(s)) return;
    if (s.resources.mushrooms < breedCost(s)) return;
    s.breedProgress += dt;
    if (s.breedProgress >= C.breedSecPerGoblin) {
      s.breedProgress = 0;
      s.resources.mushrooms -= breedCost(s);
      s.population += 1;
      note(s, 'A new goblin scrabbles out of the dark. (+1 pop)');
    }
  }
  Game.breedCost = breedCost;

  // ---- raids ----------------------------------------------------
  Game.launchRaid = function (s) {
    if (!s.unlocks.raids) return false;
    if (s.raid.active || s.pendingChoice) return false;
    if (s.jobs.raid <= 0) return false;
    const target = GG.Story ? pickRaidTarget() : null;
    s.raid = { active: true, returnsAt: Date.now() + C.raidDurationSec * 1000, target };
    s.stats.wanderlust += 0.5; // going out into the world
    note(s, 'The warband sets out to raid...');
    return true;
  };
  function pickRaidTarget() {
    return GG.RAID_TARGETS[Math.floor(Math.random() * GG.RAID_TARGETS.length)];
  }
  // choose the silly OR earnest face of a raid/event entry, per the Index.
  // Entries without a `.silly` variant always fall back to the earnest one.
  function pickVariant(entry, s) {
    return (entry.silly && Math.random() < (s.silliness || 0)) ? entry.silly : entry;
  }

  function resolveRaid(s) {
    const tgt = s.raid.target;
    s.raid = { active: false, returnsAt: 0, target: null };
    s.raidCount += 1;
    const raidRenownMult = (s.legendSpent && s.legendSpent.renown_boost) ? 2 : 1;
    s.renown = (s.renown || 0) + 2 * raidRenownMult; // raids make a name for you
    // surface the choice to the player (silly or earnest face)
    const v = pickVariant(tgt, s);
    s.pendingChoice = {
      title: v.title,
      text: v.text,
      options: v.options.map((o) => ({ ...o })),
      _raiders: s.jobs.raid,
    };
  }

  // grant a resource and keep lifetime shinies in sync (for milestones)
  function gain(s, res, amt) {
    s.resources[res] = Math.max(0, s.resources[res] + amt);
    if (res === 'shinies' && amt > 0) s.totals.shiniesTotal += amt;
  }
  // which faction "homes" each race — welcoming them earns that power's goodwill
  const RACE_HOME = { dwarf: 'karzun', human: 'aldermere', elf: 'aelinvar' };
  function gainRace(s, rc, n) {
    if (!GG.RACES[rc]) return;
    if (!s.races) s.races = {};
    s.races[rc] = Math.max(0, (s.races[rc] || 0) + n);
    if (n > 0 && RACE_HOME[rc]) Game.adjustStanding(s, RACE_HOME[rc], 2 * n);
  }
  function nudgeTrade(s) { // commerce slowly warms the merchant powers
    Game.adjustStanding(s, 'tannard', 0.3);
    Game.adjustStanding(s, 'gilded', 0.3);
  }
  const pickOne = (a) => a[Math.floor(Math.random() * a.length)];
  function loseGoblin(s) {
    if (s.population <= 1) return false;
    s.population -= 1;
    // pull from the warband first, then any other job, so counts stay valid
    if (s.jobs.raid > 0) s.jobs.raid -= 1;
    else if (s.jobs.dig > 0) s.jobs.dig -= 1;
    else if (s.jobs.forage > 0) s.jobs.forage -= 1;
    // sometimes the one who fell was a notable goblin (already counted above)
    if (s.notables && s.notables.length && Math.random() < 0.35) {
      const nb = pickOne(s.notables);
      s.notables = s.notables.filter((x) => x.id !== nb.id);
      const tr = GG.NOTABLE.traits.find((t) => t.id === nb.trait) || GG.NOTABLE.traits[0];
      chronicle(s, `${tr.adj} ${nb.name} ${nb.role} falls in the fighting. They will be a story told by the fire now — and a good one.`, 'combat');
    }
    return true;
  }
  function dominantStat(s) {
    let best = null, bestV = 0.0001;
    for (const k of ['greed', 'cruelty', 'openness', 'wanderlust']) {
      if (s.stats[k] > bestV) { bestV = s.stats[k]; best = k; }
    }
    return best;
  }

  // player resolves a raid OR event choice (shared option schema).
  // Final Choice options carry _ending (a known GG.ENDINGS key) → finish the game.
  Game.resolveChoice = function (s, optIndex) {
    if (!s.pendingChoice) return;
    const opt = s.pendingChoice.options[optIndex];
    if (!opt) return;
    // L4 — the Saga's true finale (the Bargain meta-choice)
    if (opt._isSagaFinale && opt._saga) {
      Game.resolveSagaFinale(s, opt._saga);
      return;
    }
    if (opt._ending && has(GG.ENDINGS, opt._ending)) {
      s.pendingChoice = null;
      Game.finish(s, opt._ending);
      return;
    }
    const raiders = s.pendingChoice._raiders || 1;
    // loot scales mildly with raider count (events have no raiders → mult 1)
    const mult = 1 + (raiders - 1) * 0.25;

    if (opt.cost) for (const res in opt.cost) gain(s, res, -opt.cost[res]);
    if (opt.give) for (const res in opt.give) gain(s, res, opt.give[res]);
    if (opt.race) for (const rc in opt.race) gainRace(s, rc, opt.race[rc]);
    if (opt.standing) for (const fid in opt.standing) Game.adjustStanding(s, fid, opt.standing[fid]);
    if (opt.loot) {
      for (const res in opt.loot) {
        const [lo, hi] = opt.loot[res];
        gain(s, res, Math.round((lo + Math.random() * (hi - lo)) * mult));
      }
    }
    if (opt.gamble) {
      const win = Math.random() < 0.5;
      gain(s, opt.gamble.res, win ? opt.gamble.stake * 2 : 0);
      note(s, win ? 'The bones came up goblin! Doubled the stake.' : 'The bones betrayed you. Stake lost.');
    }
    if (opt.pop) {
      if (opt.pop > 0) { s.population += opt.pop; note(s, 'A new goblin joins the warren. (+' + opt.pop + ' pop)'); }
      else for (let i = 0; i < -opt.pop; i++) loseGoblin(s);
    }
    if (opt.lean) for (const k in opt.lean) s.stats[k] += opt.lean[k];

    // idol event: amplify or soften whatever you've been becoming
    if (opt._amplify) { const d = dominantStat(s); if (d) s.stats[d] += 3; }
    if (opt._soften)  { const d = dominantStat(s); if (d) s.stats[d] = Math.max(0, s.stats[d] - 3); }

    // risky options can cost a goblin (Lookout Warrens reduce the odds)
    if (opt.risk && Math.random() < opt.risk * Game.riskFactor(s)) {
      if (loseGoblin(s)) note(s, 'A goblin did not come home.');
    }
    if (opt.log) chronicle(s, opt.log, 'event');
    s.pendingChoice = null;
  };

  // ---- trade (simple converter, raises openness) ---------------
  Game.trade = function (s, kind) {
    if (!s.unlocks.trade) return;
    // sell 10 of a resource for shinies, or buy mushrooms with shinies
    if (kind === 'sellScrap' && s.resources.scrap >= 10) {
      s.resources.scrap -= 10; const got = 4; s.resources.shinies += got;
      s.totals.shiniesTotal += got; s.tradeCount += 1; nudgeTrade(s); s.stats.openness += 0.2;
      note(s, 'Sold 10 scrap for ' + got + ' shinies.');
    }
    if (kind === 'sellMush' && s.resources.mushrooms >= 10) {
      s.resources.mushrooms -= 10; const got = 3; s.resources.shinies += got;
      s.totals.shiniesTotal += got; s.tradeCount += 1; nudgeTrade(s); s.stats.openness += 0.2;
      note(s, 'Sold 10 mushrooms for ' + got + ' shinies.');
    }
    if (kind === 'buyMush' && s.resources.shinies >= 2) {
      s.resources.shinies -= 2; s.resources.mushrooms += 12; s.tradeCount += 1; nudgeTrade(s); s.stats.openness += 0.2;
      note(s, 'Bought 12 mushrooms.');
    }
  };

  // ---- chapters & story tick -----------------------------------
  function checkChapters(s) {
    const next = GG.CHAPTERS[s.chapter];
    if (!next) return;
    const req = next.req;
    let ok = true;
    if (req.buildings && Game.distinctBuildings(s) < req.buildings) ok = false;
    if (req.buildingsDistinct && Game.distinctBuildings(s) < req.buildingsDistinct) ok = false;
    if (req.population && s.population < req.population) ok = false;
    if (req.shiniesTotal && s.totals.shiniesTotal < req.shiniesTotal) ok = false;
    if (req.settle && s.settle < req.settle) ok = false;
    if (req.greatHall && s.buildings.greatHall < req.greatHall) ok = false;
    if (ok) {
      s.chapter += 1;
      chronicle(s, '— ' + GG.Story.herald(s.chapter, s.silliness) + ' —', 'saga');
      maybeDiscover(s); // the world gradually opens up as your tale advances
    }
  }

  let ambientAccum = 0;
  function tickStory(s, dt) {
    ambientAccum += dt;
    const cadence = s.buildings.totem > 0 ? C.ambientStoryEverySec * 0.6 : C.ambientStoryEverySec;
    if (ambientAccum >= cadence) {
      ambientAccum = 0;
      chronicle(s, GG.Story.ambient(s));
    }
  }

  // the Totem speaks the Oracle (only once the Totem stands) — a riddling hint
  // toward whatever destiny you've been quietly feeding, never the number itself.
  let oracleAccum = 0;
  function tickOracle(s, dt) {
    if (!s.unlocks.destiny) return;
    oracleAccum += dt;
    if (oracleAccum < (C.oracleEverySec || 100)) return;
    oracleAccum = 0;
    const riddle = GG.Story.oracle(s);
    s.lastOracle = riddle;
    chronicle(s, riddle, 'oracle');
  }

  // caravans and wanderers bring news of the wider world — mostly flavour, and
  // sometimes the news IS how you first hear of a faction you'd never met.
  let worldNewsAccum = 0;
  function tickWorldNews(s, dt) {
    if (s.chapter < 1) return; // once the warren has woken a little
    worldNewsAccum += dt;
    if (worldNewsAccum < (C.worldNewsEverySec || 130)) return;
    worldNewsAccum = 0;
    const unknown = Object.keys(GG.FACTIONS).filter((id) => !(s.discovered && s.discovered[id]));
    if (unknown.length && Math.random() < 0.4) { Game.discoverFaction(s, pickOne(unknown)); return; }
    chronicle(s, GG.Story.worldNews(s));
  }

  // ---- notable goblins (named individuals who live, act, age, and die) ----
  const traitOf = (id) => GG.NOTABLE.traits.find((t) => t.id === id) || GG.NOTABLE.traits[0];
  function rollLife() { return 900 + Math.random() * 2100; } // 15–50 min of ACTIVE play
  function notableTitle(nb) { return GG.Story.notableTitle(nb); }
  function makeNotable(s) {
    s.notableSeq = (s.notableSeq || 0) + 1;
    return {
      id: s.notableSeq, name: pickOne(GG.NOTABLE.names), role: pickOne(GG.NOTABLE.roles),
      trait: pickOne(GG.NOTABLE.traits).id, age: 0, life: rollLife(), titleTier: 0,
    };
  }
  function advanceTitleTier(s, nb, reason) {
    if (nb.titleTier >= 3) return;
    nb.titleTier += 1;
    chronicle(s, `${notableTitle(nb)} has become ${reason}.`, 'milestone');
  }
  function notableActs(s, nb) {
    const tr = traitOf(nb.trait);
    chronicle(s, `${tr.adj} ${nb.name} ${nb.role} ${tr.act}`, 'event');
    if (tr.gain) for (const res in tr.gain) {
      const [lo, hi] = tr.gain[res];
      gain(s, res, Math.round(lo + Math.random() * (hi - lo)));
    }
    if (tr.lean) for (const k in tr.lean) s.stats[k] += tr.lean[k];
    // 10% chance a notable deed earns them a title upgrade
    if (Math.random() < 0.10) advanceTitleTier(s, nb, 'a name worth remembering');
  }
  function killNotableOldAge(s, nb) {
    const tr = traitOf(nb.trait);
    s.notables = s.notables.filter((x) => x.id !== nb.id);
    if (s.population > 1) s.population -= 1;           // an old goblin truly passes
    s.stats.openness += 0.5;                            // wisdom handed down softens the warren
    chronicle(s, `${nb.name} ${nb.role}, once ${tr.adj.toLowerCase()}, dies old and full of years and stolen soup. The young ones repeat their stories by the fire — getting half of it wrong, which is how stories survive.`, 'event');
    if (s.heir === nb.id) {
      s.heir = null;
      s.resentment = Math.min(100, (s.resentment || 0) + 20);
      chronicle(s, `The named heir is gone. The warren grows unsettled — every ambitious goblin imagines themselves in that empty seat.`, 'portent');
    }
  }

  let notableAccum = 0;
  function tickNotables(s, dt) {
    if (!Array.isArray(s.notables)) s.notables = [];
    for (const nb of s.notables) nb.age += dt;          // age continuously, only while playing
    notableAccum += dt;
    if (notableAccum < 22) return;                      // process the roster periodically
    notableAccum = 0;
    // 1) the old pass on
    for (const nb of s.notables.slice()) if (nb.age >= nb.life) killNotableOldAge(s, nb);
    // 2) a new goblin rises to fill an empty seat (one per cycle)
    if (s.notables.length < Game.notableCap(s) && s.population >= 1) {
      const nb = makeNotable(s);
      s.notables.push(nb);
      const tr = traitOf(nb.trait);
      chronicle(s, `A goblin named ${nb.name} starts to stand out from the crowd — ${tr.adj.toLowerCase()}, taking up the part of ${nb.role.replace('the ', '')}. The warren has a new notable.`, 'event');
    }
    // 3) age-milestone title advancement (20% at 5 min, 10% at 10 min, 5% at 20 min)
    for (const nb of s.notables) {
      if (nb.titleTier < 1 && nb.age >= 300 && Math.random() < 0.20)
        advanceTitleTier(s, nb, 'someone the others look to');
      else if (nb.titleTier < 2 && nb.age >= 600 && Math.random() < 0.10)
        advanceTitleTier(s, nb, 'a name in the warren\'s stories');
      else if (nb.titleTier < 3 && nb.age >= 1200 && Math.random() < 0.05)
        advanceTitleTier(s, nb, 'a legend in their own right');
    }
    // 4) someone does something in-character
    if (s.notables.length && Math.random() < 0.55) notableActs(s, pickOne(s.notables));
  }

  // ---- hold tick (resentment decay + betrayal rolls) ----------
  let holdAccum = 0;
  function tickHold(s, dt) {
    if (s.ending) return;
    // resentment decays passively; a named living heir calms it faster
    const decay = s.heir != null && (s.notables || []).some((n) => n.id === s.heir) ? 0.025 : 0.01;
    s.resentment = Math.max(0, (s.resentment || 0) - decay * dt);

    holdAccum += dt;
    if (holdAccum < 90) return;  // check every ~90s
    holdAccum = 0;

    const hold = Game.holdScore(s);
    const age_r = s.age / Math.max(1, s.lifespan);
    // betrayal risk only in the second half of life and when hold is low
    const risk = Math.max(0, (30 - hold) / 30) * Math.max(0, (age_r - 0.5) * 2);
    const heirAlive = s.heir != null && (s.notables || []).some((n) => n.id === s.heir);
    const effective = heirAlive ? risk * 0.5 : risk;
    if (effective <= 0 || Math.random() >= effective) return;

    if (!heirAlive) {
      s.resentment = Math.min(100, (s.resentment || 0) + 15);
      chronicle(s, 'Grumbling spreads through the warren. Without a clear successor, every ambitious goblin imagines themselves in your seat.', 'event');
    } else {
      s.resentment = Math.min(100, (s.resentment || 0) + 8);
      chronicle(s, 'A faction whispers against the named succession. The heir\'s name is muttered alongside less flattering alternatives.', 'event');
    }
  }

  // ---- random events -------------------------------------------
  let eventAccum = 0, eventThreshold = 0;
  function rollEventThreshold() {
    eventThreshold = C.eventMinSec + Math.random() * (C.eventMaxSec - C.eventMinSec);
  }
  rollEventThreshold();

  function eligibleEvents(s) {
    return (GG.EVENTS || []).filter((e) => {
      try { return e.when ? e.when(s) : true; } catch (_) { return false; }
    });
  }
  function pickEvent(s, pool) {
    const rf = Game.riskFactor(s);
    let total = 0;
    const weights = pool.map((e) => {
      let w = e.weight || 1;
      if (e.bad) w *= rf; // Lookout makes nasty events rarer
      total += w;
      return w;
    });
    let r = Math.random() * total;
    for (let i = 0; i < pool.length; i++) { r -= weights[i]; if (r <= 0) return pool[i]; }
    return pool[pool.length - 1];
  }
  function fireAutoEvent(s, ev) {
    const v = pickVariant(ev, s);            // silly variant may swap the text
    const fx = v.effect || ev.effect || {};  // ...and falls back to base effect
    if (fx.give) for (const res in fx.give) gain(s, res, fx.give[res]);
    if (fx.race) for (const rc in fx.race) gainRace(s, rc, fx.race[rc]);
    if (fx.standing) for (const fid in fx.standing) Game.adjustStanding(s, fid, fx.standing[fid]);
    if (fx.take) for (const res in fx.take) gain(s, res, -Math.floor(s.resources[res] * fx.take[res]));
    if (fx.pop) { if (fx.pop > 0) s.population += fx.pop; else for (let i = 0; i < -fx.pop; i++) loseGoblin(s); }
    if (fx.lean) for (const k in fx.lean) s.stats[k] += fx.lean[k];
    chronicle(s, v.text, 'event');
  }
  function tickEvents(s, dt) {
    if (s.pendingChoice || (s.raid && s.raid.active)) return; // don't pile up modals
    if (s.chapter < 1) return; // let the player settle in first
    eventAccum += dt;
    if (eventAccum < eventThreshold) return;
    eventAccum = 0;
    rollEventThreshold();
    const pool = eligibleEvents(s);
    if (!pool.length) return;
    const ev = pickEvent(s, pool);
    if (ev.options) {
      // choice event → reuse the same modal plumbing as raids (silly/earnest)
      const v = pickVariant(ev, s);
      s.pendingChoice = {
        title: v.title,
        text: v.text,
        options: v.options.map((o) => ({ ...o })),
        isEvent: true,
      };
    } else {
      fireAutoEvent(s, ev);
    }
  }

  // ---- achievements ("Annals") ---------------------------------
  function checkAchievements(s) {
    for (const a of (GG.ACHIEVEMENTS || [])) {
      if (s.achievements[a.id]) continue;
      let got = false;
      try { got = a.test(s, Game); } catch (_) { got = false; }
      if (got) {
        s.achievements[a.id] = true;
        note(s, '✦ Annal earned: ' + a.name);
        chronicle(s, '✦ The Annals remember: "' + a.name + '."', 'milestone');
      }
    }
  }

  // ---- milestones (escalation fanfares) ------------------------
  // Fire once when a scale-threshold is first crossed. We record it in
  // s.milestones (so it never repeats), drop a ⚑ Chronicle line, and push the
  // text to a transient banner queue the boot loop drains into an on-screen
  // fanfare. Pure logic + a module-level queue → no DOM here, fully testable.
  let pendingBanners = [];
  function checkMilestones(s) {
    if (!s.milestones) s.milestones = {};
    for (const m of (GG.MILESTONES || [])) {
      if (s.milestones[m.id]) continue;
      let got = false;
      try { got = m.test(s, Game); } catch (_) { got = false; }
      if (!got) continue;
      s.milestones[m.id] = true;
      const text = (m.silly && Math.random() < (s.silliness || 0)) ? m.silly : m.msg;
      chronicle(s, '⚑ ' + text, 'milestone');
      pendingBanners.push(text);
    }
  }
  Game.checkMilestones = checkMilestones;
  // boot loop calls this each frame and renders any returned banner texts
  Game.drainBanners = function () { const b = pendingBanners; pendingBanners = []; return b; };
  // mark every already-true milestone as fired WITHOUT a banner — used on load so
  // an advanced save doesn't spray retroactive fanfares on its first tick.
  function primeMilestones(s) {
    if (!s.milestones) s.milestones = {};
    for (const m of (GG.MILESTONES || [])) {
      if (s.milestones[m.id]) continue;
      let got = false; try { got = m.test(s, Game); } catch (_) { got = false; }
      if (got) s.milestones[m.id] = true;
    }
  }

  // ---- destiny meter (only revealed after Totem) ---------------
  Game.destiny = function (s) {
    const scores = {};
    let max = 0.0001, lead = null;
    for (const id in GG.ENDINGS) {
      const v = Math.max(0, GG.ENDINGS[id].score(s));
      scores[id] = v;
      if (v > max) { max = v; lead = id; }
    }
    return { scores, lead };
  };

  // ---- the Reckoning (endgame act) -----------------------------
  // Raising the Great Hall begins a staged climactic act instead of ending the
  // game on the spot. For now it auto-advances through placeholder beats and
  // then resolves the ending; E4 will pause here for the player's Final Choice,
  // and E5 will make the beats destiny-specific.
  Game.beginReckoning = function (s) {
    if (s.ending) return;
    if (!s.endgame) s.endgame = { active: false, stage: 0, accum: 0 };
    if (s.endgame.active) return;
    s.endgame.active = true; s.endgame.stage = 0; s.endgame.accum = 0;
    s.unlocks.finale = true;
    chronicle(s, GG.Story.reckoningBeat(0, s.silliness), 'saga');
  };
  function tickReckoning(s, dt) {
    if (!s.endgame || !s.endgame.active || s.ending) return;
    if (s.pendingChoice) return; // Final Choice waiting for player
    s.endgame.accum += dt;
    if (s.endgame.accum < (C.reckoningStageSec || 18)) return;
    s.endgame.accum = 0;
    s.endgame.stage += 1;
    const beat = GG.Story.reckoningBeat(s.endgame.stage, s.silliness);
    if (beat != null) chronicle(s, beat, 'saga');
    else Game.presentFinalChoice(s);
  }

  // ---- Final Choice (E4) ----------------------------------------
  // Builds the available Final Choice doors from destiny + hold + deeds.
  // Each option carries _isFinalChoice + _ending (a known GG.ENDINGS key).
  Game.finalChoiceOptions = function (s) {
    const dom = (Game.destiny(s).lead) || 'chaos';
    const hold = Game.holdScore(s);
    const cruelty  = s.stats.cruelty  || 0;
    const openness = s.stats.openness || 0;
    const wanderlust = s.stats.wanderlust || 0;
    const greed    = s.stats.greed    || 0;
    const raidCount  = s.raidCount  || 0;
    const tradeCount = s.tradeCount || 0;

    const opts = [
      // always available: follow the natural destiny
      { label: GG.Story.naturalChoiceLabel(dom), _ending: dom, _isFinalChoice: true },
    ];

    // Grip — available if hold ≥ 40 AND the natural destiny isn't already grip-type
    if (hold >= 40 && dom !== 'villain' && dom !== 'purist') {
      opts.push({
        label: cruelty >= openness
          ? 'Hold until the world stops turning.'
          : 'Seal the gates. Let no more in.',
        _ending: cruelty >= openness ? 'villain' : 'purist',
        _isFinalChoice: true,
      });
    }

    // Road — available if wanderlust is highest stat OR raided >= 3 times
    const maxStat = Math.max(cruelty, openness, wanderlust, greed);
    if (dom !== 'chaos' && (wanderlust >= maxStat || raidCount >= 3)) {
      opts.push({
        label: 'The horizon hasn\'t finished with me.',
        _ending: 'chaos',
        _isFinalChoice: true,
      });
    }

    // Open gates — available if openness is highest stat OR traded >= 3 times
    if (dom !== 'multirace' && (openness >= maxStat || tradeCount >= 3)) {
      opts.push({
        label: 'Open the gates. Make them remember.',
        _ending: 'multirace',
        _isFinalChoice: true,
      });
    }

    return opts;
  };

  Game.presentFinalChoice = function (s) {
    if (s.ending || s.pendingChoice) return;
    s.pendingChoice = {
      title: 'The Final Choice',
      text: GG.Story.finalChoiceText(s.silliness),
      options: Game.finalChoiceOptions(s),
      _isFinalChoice: true,
    };
  };

  // your mortality + the Comet — two clocks. If either runs out it ushers in
  // the Reckoning (the third road being the Great Hall itself). Both advance
  // only during active play (never offline), so you can't die while away.
  let renownAccum = 0;
  function tickMortality(s, dt) {
    if (s.ending || s.age == null) return;
    s.age += dt;
    renownAccum += dt;
    if (renownAccum >= (C.renownEverySec || 30)) {
      renownAccum = 0;
      const renownMult = (s.legendSpent && s.legendSpent.renown_boost) ? 2 : 1;
      s.renown = (s.renown || 0) + (1 + Game.settlementTier(s)) * renownMult;
    }
    // twilight portents as your end nears
    const r = s.age / Math.max(1, s.lifespan);
    if (r >= 0.9 && (s.twilight || 0) < 2) { s.twilight = 2; chronicle(s, GG.Story.twilightBeat(2, s.silliness), 'portent'); }
    else if (r >= 0.75 && (s.twilight || 0) < 1) { s.twilight = 1; chronicle(s, GG.Story.twilightBeat(1, s.silliness), 'portent'); }
    // the Comet (world doom), with rising portents
    if (s.comet && s.comet.total > 0) {
      s.comet.left = Math.max(0, s.comet.left - dt);
      const cl = s.comet.left / s.comet.total;
      const stage = cl <= 0 ? 4 : cl < 0.1 ? 3 : cl < 0.25 ? 2 : cl < 0.5 ? 1 : 0;
      if (stage > (s.comet.warned || 0) && stage < 4) { s.comet.warned = stage; chronicle(s, GG.Story.cometBeat(stage, s.silliness), 'portent'); }
      if (s.comet.left <= 0 && !s.endgame.active) {
        s.comet.warned = 4;
        chronicle(s, 'The comet falls. The Prophesied Year has come, and the world will not be the same by morning. The Reckoning is upon you.', 'saga');
        Game.beginReckoning(s);
        return;
      }
    }
    // death of old age
    if (s.age >= s.lifespan && !s.endgame.active) {
      chronicle(s, 'And then, one quiet morning, the runt from the flooded hole simply does not wake. A whole impossible, ridiculous, legendary life reaches its end — and the tale rushes now to its Reckoning.', 'saga');
      Game.beginReckoning(s);
    }
  }

  // ---- finale ---------------------------------------------------
  // endingId: optional override from the Final Choice; falls back to scored destiny.
  Game.finish = function (s, endingId) {
    if (s.endgame) s.endgame.active = false;
    const id = (endingId && has(GG.ENDINGS, endingId)) ? endingId : (Game.destiny(s).lead || 'chaos');
    s.ending = { id, name: GG.ENDINGS[id].name, text: GG.Story.finale(id, s.silliness) };
    chronicle(s, '════ THE END ════', 'saga');
    // bank ✦ Legend earned this life so the legacy screen can spend it immediately;
    // also accrue the lifetime total (never spent down) that gates the L4 finale doors.
    const earned = Game.legendEarned(s);
    s.sagaLegend = (s.sagaLegend || 0) + earned;
    s.sagaLegendEarned = (s.sagaLegendEarned || 0) + earned;
  };

  // ---- legacy / succession (L1–L3) --------------------------------

  // ✦ Legend earned from this life's achievements; uses s.ending for the ending bonus.
  Game.legendEarned = function (s) {
    let pts = 0;
    pts += Math.floor((s.renown || 0) / 5);       // legend through renown
    pts += Game.settlementTier(s) * 2;             // city size
    for (const id in GG.FACTIONS) {
      if ((s.standing && s.standing[id] || 0) >= 70) pts++; // each allied faction
    }
    const endingBonus = { chaos: 2, multirace: 3, purist: 2, villain: 1 };
    if (s.ending) pts += (endingBonus[s.ending.id] || 0);
    return Math.max(1, Math.floor(pts));
  };

  // Can the player buy a legend-tree upgrade right now?
  // Only purchasable on the legacy screen (s.ending set) with enough in the bank.
  Game.canBuyLegend = function (s, id) {
    if (!s.ending) return false;
    const def = (GG.LEGEND_TREE || []).find((u) => u.id === id);
    if (!def) return false;
    if (s.legendSpent && s.legendSpent[id]) return false; // already owned
    return (s.sagaLegend || 0) >= def.cost;
  };

  // Purchase a legend-tree upgrade (deducts from sagaLegend).
  Game.buyLegend = function (s, id) {
    if (!Game.canBuyLegend(s, id)) return false;
    const def = (GG.LEGEND_TREE || []).find((u) => u.id === id);
    if (!s.legendSpent) s.legendSpent = {};
    s.legendSpent[id] = true;
    s.sagaLegend = (s.sagaLegend || 0) - def.cost;
    return true;
  };

  // Begin the next life: world persists, personal arc resets.
  // Only callable when s.ending is set and sagaLife < sagaLives.
  Game.succession = function (s) {
    if (!s.ending) return;
    const maxLives = GG.CONFIG.sagaLives || 4;
    if ((s.sagaLife || 1) >= maxLives) return; // last life → handled by L4, not succession

    const newSagaLife = (s.sagaLife || 1) + 1;
    const founder = {
      name: s.name,
      endingId: s.ending.id,
      endingName: s.ending.name,
      lifeNum: s.sagaLife || 1,
    };
    const spentSoFar = Object.assign({}, s.legendSpent || {});

    // world state that persists (with standing decay to reflect time passage)
    const worldStanding = {};
    for (const id in s.standing) {
      worldStanding[id] = Math.round((s.standing[id] || 0) * 0.85);
    }
    if (spentSoFar.faction_floor) {
      for (const id in worldStanding) {
        if (worldStanding[id] < -20) worldStanding[id] = -20; // floor at Wary
      }
    }

    // new protagonist: heir or new runt
    const heirNotable = s.heir ? s.notables.find(function (nb) { return nb.id === s.heir; }) : null;
    const isHeir = !!heirNotable;
    const mort = freshMortality();
    let newName, newLegendIntro;
    if (heirNotable) {
      newName = heirNotable.name;
      newLegendIntro = GG.Story.heirIntro(heirNotable, founder, s.silliness);
    } else {
      const leg = GG.Story.makeLegend(s.silliness);
      newName = leg.name;
      newLegendIntro = leg.intro.replace('#NAME#', leg.name);
    }

    // carry forward unlocks (buildings persist → raids/trade stay active);
    // augment with legend-tree purchases; reset finale so Reckoning must be earned again
    const worldUnlocks = Object.assign({}, s.unlocks);
    worldUnlocks.raids = worldUnlocks.raids || !!spentSoFar.start_raids;
    worldUnlocks.trade = worldUnlocks.trade || !!spentSoFar.start_trade;
    worldUnlocks.finale = false; // Reckoning must be earned each life

    // reset s in place for the new life
    s.sagaLife = newSagaLife;
    // sagaLegend already reflects earned from this life (banked in Game.finish)
    s.legendSpent = spentSoFar;
    s.founder = founder;
    // remember every prior life — the Saga's roll of legends, shown in the L4 epilogue
    s.founders = (Array.isArray(s.founders) ? s.founders.slice() : []);
    s.founders.push(founder);
    s.name = newName;
    s.legendIntro = newLegendIntro;
    s.startedAt = Date.now();
    s.lastSeen = Date.now();
    s.resources = { mushrooms: 0, scrap: 0, shinies: 0, ash: 0, iron: 0, grit: 0 };
    s.totals = { shiniesTotal: 0 };
    s.population = spentSoFar.pop_start ? 3 : 1;
    s.peakPop = s.population;
    s.races = { dwarf: 0, human: 0, elf: 0 };
    s.notables = s.notables.slice(); // bloodlines persist unchanged
    s.standing = worldStanding;
    s.discovered = Object.assign({}, s.discovered);
    s.jobs = { forage: 0, dig: 0, raid: 0 };
    // buildings, settle, chapter, breakthroughs, milestones, achievements, eraSeen persist
    s.stats = { greed: 0, cruelty: 0, openness: 0, wanderlust: 0 };
    if (isHeir && spentSoFar.heir_bonus) {
      s.stats.cruelty = 40; // predecessor's fearsome reputation lingers
    }
    s.raidCount = 0;
    s.tradeCount = 0;
    s.buyAmt = 1;
    s.unlocks = worldUnlocks;
    s.breedProgress = 0;
    s.raid = { active: false, returnsAt: 0, target: null };
    s.pendingChoice = null;
    s.chronicle = [];
    s.chronCount = 0;
    s.lastOracle = null;
    s.endgame = { active: false, stage: 0, accum: 0 };
    s.age = 0;
    s.lifespan = mort.lifespan;
    s.renown = 0;
    s.twilight = 0;
    s.comet = mort.comet;
    s.ending = null;
    s.heir = null;
    s.resentment = 0;
    s.log = [];

    // chronicle the start of the new life
    const sagaTag = 'Life ' + newSagaLife + ' of ' + maxLives + '.';
    const who = heirNotable
      ? newName + ' inherits the warren of ' + founder.name + '.'
      : 'A new runt crawls out of the mud — the warren endures.';
    chronicle(s, sagaTag + ' ' + who, 'saga');
    // the Bargain spine (L4): the witch returns at the dawn of each new life,
    // her price compounding as the Saga draws toward its resolution.
    const bargain = GG.Story.bargainBeat(newSagaLife, s.silliness);
    if (bargain) chronicle(s, bargain, 'portent');
  };

  // ---- the Saga's true finale (L4) --------------------------------
  // True once the protagonist is living the final life of the Saga.
  Game.isFinalLife = function (s) {
    const maxLives = GG.CONFIG.sagaLives || 4;
    return (s.sagaLife || 1) >= maxLives;
  };

  // The meta-choice doors offered when the Bargain comes due. 'pay' is always
  // available; 'break'/'turn' are earned via cumulative Legend (and, for 'turn',
  // a clever/open final life). Each option carries _isSagaFinale + _saga (a known
  // GG.SAGA_ENDINGS key).
  Game.sagaFinaleOptions = function (s) {
    const earned = s.sagaLegendEarned || 0;
    const opts = [
      { label: GG.Story.sagaFinaleLabel('pay', s.silliness), _saga: 'pay', _isSagaFinale: true },
    ];
    if (earned >= (GG.CONFIG.sagaBreakLegend || 10)) {
      opts.push({ label: GG.Story.sagaFinaleLabel('break', s.silliness), _saga: 'break', _isSagaFinale: true });
    }
    // 'turn' needs the most Legend AND a final life led by openness or wanderlust
    // (the cleverness/insight to flip the deal rather than meet it head-on).
    const clever = (s.stats.openness || 0) >= (s.stats.cruelty || 0)
                || (s.stats.wanderlust || 0) >= (s.stats.cruelty || 0);
    if (earned >= (GG.CONFIG.sagaTurnLegend || 16) && clever) {
      opts.push({ label: GG.Story.sagaFinaleLabel('turn', s.silliness), _saga: 'turn', _isSagaFinale: true });
    }
    return opts;
  };

  // Open the Bargain's Reckoning — the final meta-choice. Only on the final life,
  // once its per-life ending has been reached (s.ending set), and not already resolved.
  Game.beginSagaFinale = function (s) {
    if (!s.ending || s.sagaEnding) return false;
    if (!Game.isFinalLife(s)) return false;
    s.pendingChoice = {
      title: 'The Bargain Comes Due',
      text: GG.Story.sagaFinaleText(s, s.silliness),
      options: Game.sagaFinaleOptions(s),
      _isSagaFinale: true,
    };
    return true;
  };

  // Resolve the Saga into its true ending. Builds the founders roll from every
  // prior life plus this one, and freezes the world for good.
  Game.resolveSagaFinale = function (s, choiceId) {
    if (!has(GG.SAGA_ENDINGS, choiceId)) choiceId = 'pay';
    const text = GG.Story.sagaEnding(choiceId, s, s.silliness);
    s.sagaEnding = { id: choiceId, name: GG.SAGA_ENDINGS[choiceId].name, text };
    s.pendingChoice = null;
    chronicle(s, '════ THE SAGA ENDS ════', 'saga');
  };

  // ---- master tick ---------------------------------------------
  const ERA_NAMES = { 2: 'Era II — Iron Hunger', 3: 'Era III — World Blight' };
  function tickEra(s) {
    if (!s.eraSeen || typeof s.eraSeen !== 'object') s.eraSeen = {};
    const era = Game.era(s);
    if (era > 1 && !s.eraSeen[era]) {
      s.eraSeen[era] = true;
      const name = ERA_NAMES[era] || ('Era ' + era);
      pendingBanners.push(name);
      chronicle(s, `The age turns. ${name} begins.`, 'saga');
    }
  }

  Game.tick = function (s, dtSec) {
    if (s.ending || s.sagaEnding) return; // game over (per-life or whole Saga) — world frozen
    applyProduction(s, dtSec);

    tickBreeding(s, dtSec);

    if (s.raid.active && Date.now() >= s.raid.returnsAt) {
      resolveRaid(s);
    }

    tickStory(s, dtSec);
    tickOracle(s, dtSec);
    tickWorldNews(s, dtSec);
    tickNotables(s, dtSec);
    tickHold(s, dtSec);
    tickEra(s);
    tickReckoning(s, dtSec);
    tickMortality(s, dtSec);
    tickEvents(s, dtSec);
    const tp = Game.totalPop(s);
    if (tp > (s.peakPop || 0)) s.peakPop = tp; // peak whole-tribe size gates building reveals
    checkChapters(s);
    checkAchievements(s);
    checkMilestones(s);
    s.lastSeen = Date.now();
  };

  // apply net per-second production for all resources over `dt` seconds,
  // crediting passive shinies (e.g. the Brewery) toward lifetime totals.
  function applyProduction(s, dt) {
    const r = Game.rates(s);
    for (const res of ['mushrooms', 'scrap', 'shinies']) {
      const delta = r[res] * dt;
      s.resources[res] = Math.max(0, s.resources[res] + delta);
      if (res === 'shinies' && delta > 0) s.totals.shiniesTotal += delta;
    }
    // era-2 resources: ash and iron clamp at 0; grit can go negative (starvation mechanic)
    s.resources.ash  = Math.max(0, (s.resources.ash  || 0) + (r.ash  || 0) * dt);
    s.resources.iron = Math.max(0, (s.resources.iron || 0) + (r.iron || 0) * dt);
    s.resources.grit = (s.resources.grit || 0) + (r.grit || 0) * dt;
  }

  // ---- offline catch-up ----------------------------------------
  Game.applyOffline = function (s) {
    const now = Date.now();
    let dt = (now - s.lastSeen) / 1000;
    if (dt < 5) return 0;
    const capHours = (s.legendSpent && s.legendSpent.offline_cap) ? 24 : (C.offlineCapHours || 8);
    const capped = Math.min(dt, capHours * 3600);
    applyProduction(s, capped);
    s.lastSeen = now;
    return capped;
  };

  // ---- persistence ---------------------------------------------
  Game.save = function (s) {
    try { localStorage.setItem(C.saveKey, JSON.stringify(s)); } catch (e) {}
  };
  Game.load = function () {
    try {
      const raw = localStorage.getItem(C.saveKey);
      if (!raw) return null;
      const s = JSON.parse(raw);
      return migrate(s);
    } catch (e) { return null; }
  };
  Game.reset = function () {
    try { localStorage.removeItem(C.saveKey); } catch (e) {}
  };
  Game.fresh = newState;

  // ---- export / import (portable save codes) -------------------
  Game.exportCode = function (s) {
    try { return btoa(unescape(encodeURIComponent(JSON.stringify(s)))); }
    catch (e) { return null; }
  };
  Game.importCode = function (code) {
    try {
      if (typeof code !== 'string') return null;
      const json = decodeURIComponent(escape(atob(code.trim())));
      const s = JSON.parse(json);
      if (!s || typeof s !== 'object' || Array.isArray(s) || !s.resources) return null;
      const state = migrate(s);
      // a freshly imported save is never mid-encounter: drop any interactive
      // objects so a crafted code can't smuggle a renderable choice/raid blob.
      state.pendingChoice = null;
      state.raid = { active: false, returnsAt: 0, target: null };
      return state;
    } catch (e) { return null; }
  };

  // tolerate older/partial saves by filling gaps from a fresh state
  function migrate(s) {
    const base = newState();
    const merged = Object.assign({}, base, s);
    merged.resources = Object.assign({}, base.resources, s.resources);
    merged.jobs = Object.assign({}, base.jobs, s.jobs);
    merged.buildings = Object.assign({}, base.buildings, s.buildings);
    merged.stats = Object.assign({}, base.stats, s.stats);
    merged.unlocks = Object.assign({}, base.unlocks, s.unlocks);
    merged.totals = Object.assign({}, base.totals, s.totals);
    merged.raid = Object.assign({}, base.raid, s.raid);
    merged.achievements = Object.assign({}, s.achievements || {});
    merged.milestones = Object.assign({}, s.milestones || {});
    const out = sanitizeState(merged, base);
    primeMilestones(out); // an already-advanced save shouldn't banner retroactively
    return out;
  }

  // ---- save hardening ------------------------------------------
  // A save can come from an untrusted source (a shared import code), and
  // several numeric fields are interpolated straight into the DOM. Coerce
  // EVERYTHING to its expected type/range here so loaded data can never carry
  // markup or break the simulation. This is the single trust boundary for
  // both localStorage loads and imported codes.
  const numKeys = ['mushrooms', 'scrap', 'shinies', 'ash', 'iron', 'grit'];
  function n(v, def) { v = +v; return Number.isFinite(v) ? v : (def || 0); }
  function nonneg(v, def) { return Math.max(0, n(v, def)); }
  function intNonneg(v, def) { return Math.max(0, Math.trunc(n(v, def))); }
  function str(v, def) { return typeof v === 'string' ? v : (def || ''); }
  function bool(v) { return v === true; }

  const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k);

  function sanitizeState(m, base) {
    // Rebuild every sub-object from KNOWN keys only, coercing values. This both
    // coerces types and drops any extra/attacker-injected keys (e.g. "__proto__").
    const res = {}; for (const k of numKeys) res[k] = nonneg(m.resources && m.resources[k]); m.resources = res;
    m.totals = { shiniesTotal: nonneg(m.totals && m.totals.shiniesTotal) };
    // factions: known ids only — standing clamped to [-100,100], discovery sticky
    const standing = {}, disc = {};
    for (const id in GG.FACTIONS) {
      const base = GG.FACTIONS[id].baseStanding || 0;
      standing[id] = Math.max(-100, Math.min(100, n(m.standing && m.standing[id], base)));
      disc[id] = !!(m.discovered && m.discovered[id]) || !!GG.FACTIONS[id].startKnown;
    }
    m.standing = standing; m.discovered = disc;
    // other races (known keys only, integer counts)
    const races = {}; for (const rc in GG.RACES) races[rc] = intNonneg(m.races && m.races[rc]); m.races = races;
    // population & job assignments (rendered raw → must be plain integers)
    m.population = Math.max(1, intNonneg(m.population, 1));
    const total = m.population + Object.values(races).reduce((a, b) => a + b, 0);
    m.peakPop = Math.max(intNonneg(m.peakPop, 0), total); // never behind the current tribe
    // notable roster — validated, bounded, fields coerced (rendered → must be safe)
    m.notableSeq = intNonneg(m.notableSeq, 0);
    const validTrait = (id) => GG.NOTABLE.traits.some((t) => t.id === id);
    m.notables = Array.isArray(m.notables)
      ? m.notables.filter((x) => x && typeof x === 'object').slice(0, 8).map((x, i) => ({
          id: intNonneg(x.id, i + 1),
          name: str(x.name, 'A Goblin'),
          role: str(x.role, 'the Forager'),
          trait: validTrait(x.trait) ? x.trait : GG.NOTABLE.traits[0].id,
          age: nonneg(x.age),
          life: Math.max(60, nonneg(x.life, 1200)),
          titleTier: Math.min(3, intNonneg(x.titleTier, 0)),
        }))
      : [];
    const jobs = {}; for (const k of ['forage', 'dig', 'raid']) jobs[k] = intNonneg(m.jobs && m.jobs[k]); m.jobs = jobs;
    // buildings: only known ids, integer levels (rendered raw as ×level)
    const blds = {}; for (const id in base.buildings) blds[id] = intNonneg(m.buildings && m.buildings[id]); m.buildings = blds;
    // hidden stats
    const stats = {}; for (const k of ['greed', 'cruelty', 'openness', 'wanderlust']) stats[k] = nonneg(m.stats && m.stats[k]); m.stats = stats;
    // progress / counters
    m.settle = nonneg(m.settle);
    m.raidCount = intNonneg(m.raidCount);
    m.tradeCount = intNonneg(m.tradeCount);
    m.breedProgress = nonneg(m.breedProgress);
    m.chapter = Math.min(GG.CHAPTERS.length, intNonneg(m.chapter));
    m.silliness = Math.min(1, nonneg(m.silliness, 0.3));
    m.buyAmt = m.buyAmt === 'max' ? 'max' : Math.max(1, intNonneg(m.buyAmt, 1));
    m.startedAt = n(m.startedAt, Date.now());
    m.lastSeen = n(m.lastSeen, Date.now());
    m.version = intNonneg(m.version, 1);
    // unlock flags → strict booleans (known keys only)
    const unl = {}; for (const k in base.unlocks) unl[k] = bool(m.unlocks && m.unlocks[k]); m.unlocks = unl;
    // achievements → only known ids, boolean-true
    const ach = {};
    for (const a of (GG.ACHIEVEMENTS || [])) if (m.achievements && m.achievements[a.id]) ach[a.id] = true;
    m.achievements = ach;
    // milestones → only known ids, boolean-true (rejects "__proto__"/unknowns)
    const mil = {};
    for (const def of (GG.MILESTONES || [])) if (m.milestones && m.milestones[def.id]) mil[def.id] = true;
    m.milestones = mil;
    // narrative text (escaped on render, but coerce + bound length anyway)
    m.name = str(m.name, base.name);
    m.legendIntro = str(m.legendIntro, base.legendIntro);
    m.lastOracle = (m.lastOracle == null) ? null : str(m.lastOracle, '');
    // the Reckoning act state
    const eg = (m.endgame && typeof m.endgame === 'object') ? m.endgame : {};
    m.endgame = { active: bool(eg.active), stage: intNonneg(eg.stage), accum: nonneg(eg.accum) };
    // mortality + the Comet
    m.age = nonneg(m.age);
    m.lifespan = Math.max(60, nonneg(m.lifespan, C.lifespanMinSec || 3000));
    m.renown = nonneg(m.renown);
    m.twilight = Math.max(0, Math.min(2, intNonneg(m.twilight)));
    const cm = (m.comet && typeof m.comet === 'object') ? m.comet : {};
    const ctot = Math.max(60, nonneg(cm.total, C.cometMinSec || 3600));
    m.comet = { total: ctot, left: Math.max(0, Math.min(ctot, nonneg(cm.left, ctot))), warned: Math.max(0, Math.min(4, intNonneg(cm.warned))) };
    m.log = Array.isArray(m.log) ? m.log.filter((x) => typeof x === 'string').slice(0, 4) : [];
    // eraSeen — only known era keys (2, 3); era 1 is the starting era, no fanfare needed
    const es = (m.eraSeen && typeof m.eraSeen === 'object') ? m.eraSeen : {};
    m.eraSeen = {};
    for (const k of [2, 3]) { if (es[k]) m.eraSeen[k] = true; }
    // breakthroughs — only known ids from GG.BREAKTHROUGHS (rejects unknown/proto keys)
    const bk = (m.breakthroughs && typeof m.breakthroughs === 'object') ? m.breakthroughs : {};
    m.breakthroughs = {};
    for (const br of (GG.BREAKTHROUGHS || [])) { if (bk[br.id]) m.breakthroughs[br.id] = true; }
    m.chronicle = Array.isArray(m.chronicle)
      ? m.chronicle.filter((c) => c && typeof c.msg === 'string')
          .map((c) => ({ t: n(c.t, Date.now()), msg: c.msg,
                         kind: CHRONICLE_KINDS.has(c.kind) ? c.kind : 'world' })).slice(-200)
      : [];
    m.chronCount = Math.max(intNonneg(m.chronCount, 0), m.chronicle.length); // never behind stored entries
    // ending: only a KNOWN, own-property ending id (rejects "__proto__" etc.)
    const eid = (m.ending && typeof m.ending === 'object') ? m.ending.id : null;
    if (typeof eid === 'string' && has(GG.ENDINGS, eid)) {
      m.ending = {
        id: eid,
        name: str(m.ending.name, GG.ENDINGS[eid].name),
        text: Array.isArray(m.ending.text) ? m.ending.text.filter((x) => typeof x === 'string') : [],
      };
    } else {
      m.ending = null;
    }
    // hold / succession
    m.resentment = Math.min(100, nonneg(m.resentment));
    m.heir = (Number.isInteger(m.heir) && m.heir > 0) ? m.heir : null;
    // transient interactive objects are validated/cleared by their callers.
    // The Final Choice (E4) and the Saga finale (L4) are both re-derivable from
    // state (the modal re-opens them from the ending card), so drop any loaded one
    // — never trust a crafted choice blob with embedded _ending/_saga keys.
    if (m.pendingChoice && typeof m.pendingChoice === 'object'
        && (m.pendingChoice._isFinalChoice || m.pendingChoice._isSagaFinale)) {
      m.pendingChoice = null;
    } else {
      m.pendingChoice = (m.pendingChoice && typeof m.pendingChoice === 'object') ? m.pendingChoice : null;
    }
    m.raid = Object.assign({ active: false, returnsAt: 0, target: null }, m.raid);
    m.raid.active = bool(m.raid.active);
    m.raid.returnsAt = n(m.raid.returnsAt);
    // Saga / Legacy (L1–L3)
    m.sagaLife = Math.max(1, Math.min(GG.CONFIG.sagaLives || 4, intNonneg(m.sagaLife, 1)));
    m.sagaLegend = intNonneg(m.sagaLegend, 0);
    m.sagaLegendEarned = intNonneg(m.sagaLegendEarned, 0); // L4 finale gate (lifetime ✦)
    const ltSpent = (m.legendSpent && typeof m.legendSpent === 'object') ? m.legendSpent : {};
    m.legendSpent = {};
    for (const upg of (GG.LEGEND_TREE || [])) { if (ltSpent[upg.id]) m.legendSpent[upg.id] = true; }
    // a single prior-life record, rebuilt from known fields only (rejects markup/proto keys)
    const sanFounder = (f) => (f && typeof f === 'object') ? {
      name: str(f.name, ''),
      endingId: has(GG.ENDINGS, f.endingId) ? str(f.endingId, '') : '',
      endingName: str(f.endingName, ''),
      lifeNum: Math.max(1, intNonneg(f.lifeNum, 1)),
    } : null;
    m.founder = sanFounder(m.founder);
    // the founders roll (L4) — bounded list of prior-life records, oldest first
    const maxFounders = (GG.CONFIG.sagaLives || 4);
    m.founders = Array.isArray(m.founders)
      ? m.founders.map(sanFounder).filter(Boolean).slice(0, maxFounders)
      : [];
    // the true Saga ending (L4): only a KNOWN GG.SAGA_ENDINGS id survives
    const sgid = (m.sagaEnding && typeof m.sagaEnding === 'object') ? m.sagaEnding.id : null;
    if (typeof sgid === 'string' && has(GG.SAGA_ENDINGS, sgid)) {
      m.sagaEnding = {
        id: sgid,
        name: str(m.sagaEnding.name, GG.SAGA_ENDINGS[sgid].name),
        text: Array.isArray(m.sagaEnding.text) ? m.sagaEnding.text.filter((x) => typeof x === 'string') : [],
      };
    } else {
      m.sagaEnding = null;
    }
    return m;
  }
})();
