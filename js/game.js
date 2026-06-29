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

  // ---- fresh state ---------------------------------------------
  // `silliness` is the Silliness Index (0..1) the player sets before starting:
  // the probability that any narrative draw uses the silly/satirical register.
  function newState(silliness) {
    silliness = (silliness == null) ? 0.3 : Math.max(0, Math.min(1, silliness));
    const legend = GG.Story.makeLegend(silliness);
    return {
      version: 1,
      startedAt: Date.now(),
      lastSeen: Date.now(),
      silliness,
      name: legend.name,
      legendIntro: legend.intro.replace('#NAME#', legend.name),

      resources: { mushrooms: 0, scrap: 0, shinies: 0 },
      totals: { shiniesTotal: 0 }, // lifetime, for milestones

      population: 1,
      peakPop: 1,           // highest population ever reached (gates building reveals)
      jobs: { forage: 0, dig: 0, raid: 0 },

      buildings: {
        mushroomPatch: 0, scrapHeap: 0, burrow: 0,
        warTent: 0, lookout: 0, tradingPost: 0, brewery: 0, totem: 0, greatHall: 0,
      },

      stats: { greed: 0, cruelty: 0, openness: 0, wanderlust: 0 },
      settle: 0,           // how "rooted" you are (from building)
      raidCount: 0,
      tradeCount: 0,
      buyAmt: 1,           // bulk-buy selector for buildings (1 | 10 | 'max')
      achievements: {},    // id -> true once earned

      unlocks: { breeding: false, raids: false, trade: false, destiny: false, finale: false },

      chapter: 0,
      breedProgress: 0,
      raid: { active: false, returnsAt: 0, target: null },
      pendingChoice: null, // {title,text,options}

      chronicle: [],
      chronCount: 0,       // monotonic entry counter (UI dedup key)
      lastOracle: null,    // most recent Oracle riddle (shown in place of a destiny meter)
      ending: null,        // set when game is finished
      log: [],             // short transient action feedback
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

  Game.distinctBuildings = function (s) {
    return Object.values(s.buildings).filter((v) => v > 0).length;
  };

  // a building's option only appears once the tribe has PEAKED at revealPop
  // goblins — so the build menu unfolds gradually as the warren grows.
  Game.buildingRevealed = function (s, id) {
    const need = GG.BUILDINGS[id].revealPop || 0;
    return (s.peakPop || s.population || 1) >= need;
  };

  // production per second (net), plus a breakdown for the UI
  Game.rates = function (s) {
    const r = { mushrooms: 0, scrap: 0, shinies: 0 };
    // building passive
    for (const id in s.buildings) {
      const lvl = s.buildings[id];
      const def = GG.BUILDINGS[id];
      if (lvl > 0 && def.prod) {
        for (const res in def.prod) r[res] += def.prod[res] * lvl;
      }
    }
    // assigned goblins
    r.mushrooms += s.jobs.forage * GG.JOBS.forage.perGoblin;
    r.scrap += s.jobs.dig * GG.JOBS.dig.perGoblin;
    // upkeep
    r.mushrooms -= s.population * C.upkeepPerGoblin;
    return r;
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

  // what the place LOOKS like now: 0 (a hole) … 6 (a city), derived from how
  // rooted you are, how built-up, and how big the tribe has grown.
  Game.settlementTier = function (s) {
    const score = s.settle + Game.distinctBuildings(s) + Math.floor((s.peakPop || s.population || 1) / 3);
    const cuts = [2, 5, 8, 12, 16, 21]; // boundaries between the 7 tiers
    let t = 0;
    for (const c of cuts) if (score >= c) t++;
    return t;
  };

  // ---- verbs ----------------------------------------------------
  function note(s, msg) {
    s.log.unshift(msg);
    if (s.log.length > 4) s.log.length = 4;
  }
  function chronicle(s, msg) {
    s.chronicle.push({ t: Date.now(), msg });
    if (s.chronicle.length > 200) s.chronicle.shift();
    // monotonic count of every entry ever added — the UI keys its dedup on this
    // so a re-render is never skipped due to timestamp/text collisions, even at
    // the 200-entry cap where length stops changing.
    s.chronCount = (s.chronCount || 0) + 1;
  }
  Game.chronicle = chronicle;

  Game.manual = function (s, kind) {
    if (kind === 'forage') { s.resources.mushrooms += 1; note(s, '+1 ' + GG.RESOURCES.mushrooms.sym); }
    if (kind === 'dig') { s.resources.scrap += 1; note(s, '+1 ' + GG.RESOURCES.scrap.sym); }
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
    if (!Game.buildingRevealed(s, id)) return false;
    const cost = Game.buildingCost(s, id);
    if (!Game.canAfford(s, cost)) return false;
    for (const res in cost) s.resources[res] -= cost[res];
    s.buildings[id] += 1;

    if (def.unlocks) s.unlocks[def.unlocks] = true;
    if (def.settle) s.settle += def.settle;
    if (def.lean) for (const k in def.lean) s.stats[k] += def.lean[k];

    // first-time-built gets a chronicle beat
    if (s.buildings[id] === 1) chronicle(s, firstBuildLine(id));
    if (id === 'greatHall') Game.finish(s);
    return true;
  }

  // build `count` levels (a number, or 'max'). returns how many were raised.
  Game.build = function (s, id, count) {
    const def = GG.BUILDINGS[id];
    let want = count === 'max' ? Infinity : (count || 1);
    if (def.max === 1) want = 1; // one-of buildings ignore bulk
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
  function loseGoblin(s) {
    if (s.population <= 1) return false;
    s.population -= 1;
    // pull from the warband first, then any other job, so counts stay valid
    if (s.jobs.raid > 0) s.jobs.raid -= 1;
    else if (s.jobs.dig > 0) s.jobs.dig -= 1;
    else if (s.jobs.forage > 0) s.jobs.forage -= 1;
    return true;
  }
  function dominantStat(s) {
    let best = null, bestV = 0.0001;
    for (const k of ['greed', 'cruelty', 'openness', 'wanderlust']) {
      if (s.stats[k] > bestV) { bestV = s.stats[k]; best = k; }
    }
    return best;
  }

  // player resolves a raid OR event choice (shared option schema)
  Game.resolveChoice = function (s, optIndex) {
    if (!s.pendingChoice) return;
    const opt = s.pendingChoice.options[optIndex];
    const raiders = s.pendingChoice._raiders || 1;
    // loot scales mildly with raider count (events have no raiders → mult 1)
    const mult = 1 + (raiders - 1) * 0.25;

    if (opt.cost) for (const res in opt.cost) gain(s, res, -opt.cost[res]);
    if (opt.give) for (const res in opt.give) gain(s, res, opt.give[res]);
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
    if (opt.log) chronicle(s, opt.log);
    s.pendingChoice = null;
  };

  // ---- trade (simple converter, raises openness) ---------------
  Game.trade = function (s, kind) {
    if (!s.unlocks.trade) return;
    // sell 10 of a resource for shinies, or buy mushrooms with shinies
    if (kind === 'sellScrap' && s.resources.scrap >= 10) {
      s.resources.scrap -= 10; const got = 4; s.resources.shinies += got;
      s.totals.shiniesTotal += got; s.tradeCount += 1; s.stats.openness += 0.2;
      note(s, 'Sold 10 scrap for ' + got + ' shinies.');
    }
    if (kind === 'sellMush' && s.resources.mushrooms >= 10) {
      s.resources.mushrooms -= 10; const got = 3; s.resources.shinies += got;
      s.totals.shiniesTotal += got; s.tradeCount += 1; s.stats.openness += 0.2;
      note(s, 'Sold 10 mushrooms for ' + got + ' shinies.');
    }
    if (kind === 'buyMush' && s.resources.shinies >= 2) {
      s.resources.shinies -= 2; s.resources.mushrooms += 12; s.tradeCount += 1; s.stats.openness += 0.2;
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
      chronicle(s, '— ' + GG.Story.herald(s.chapter, s.silliness) + ' —');
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
    chronicle(s, riddle);
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
    if (fx.take) for (const res in fx.take) gain(s, res, -Math.floor(s.resources[res] * fx.take[res]));
    if (fx.pop) { if (fx.pop > 0) s.population += fx.pop; else for (let i = 0; i < -fx.pop; i++) loseGoblin(s); }
    if (fx.lean) for (const k in fx.lean) s.stats[k] += fx.lean[k];
    chronicle(s, v.text);
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
        chronicle(s, '✦ The Annals remember: "' + a.name + '."');
      }
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

  // ---- finale ---------------------------------------------------
  Game.finish = function (s) {
    const d = Game.destiny(s);
    const id = d.lead || 'chaos';
    s.ending = { id, name: GG.ENDINGS[id].name, text: GG.Story.finale(id, s.silliness) };
    chronicle(s, '════ THE END ════');
  };

  // ---- master tick ---------------------------------------------
  Game.tick = function (s, dtSec) {
    if (s.ending) return; // game over, world frozen
    applyProduction(s, dtSec);

    tickBreeding(s, dtSec);

    if (s.raid.active && Date.now() >= s.raid.returnsAt) {
      resolveRaid(s);
    }

    tickStory(s, dtSec);
    tickOracle(s, dtSec);
    tickEvents(s, dtSec);
    if (s.population > (s.peakPop || 0)) s.peakPop = s.population; // for gradual building reveals
    checkChapters(s);
    checkAchievements(s);
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
  }

  // ---- offline catch-up ----------------------------------------
  Game.applyOffline = function (s) {
    const now = Date.now();
    let dt = (now - s.lastSeen) / 1000;
    if (dt < 5) return 0;
    const capped = Math.min(dt, C.offlineCapHours * 3600);
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
    return sanitizeState(merged, base);
  }

  // ---- save hardening ------------------------------------------
  // A save can come from an untrusted source (a shared import code), and
  // several numeric fields are interpolated straight into the DOM. Coerce
  // EVERYTHING to its expected type/range here so loaded data can never carry
  // markup or break the simulation. This is the single trust boundary for
  // both localStorage loads and imported codes.
  const numKeys = ['mushrooms', 'scrap', 'shinies'];
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
    // population & job assignments (rendered raw → must be plain integers)
    m.population = Math.max(1, intNonneg(m.population, 1));
    m.peakPop = Math.max(m.population, intNonneg(m.peakPop, m.population));
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
    // narrative text (escaped on render, but coerce + bound length anyway)
    m.name = str(m.name, base.name);
    m.legendIntro = str(m.legendIntro, base.legendIntro);
    m.lastOracle = (m.lastOracle == null) ? null : str(m.lastOracle, '');
    m.log = Array.isArray(m.log) ? m.log.filter((x) => typeof x === 'string').slice(0, 4) : [];
    m.chronicle = Array.isArray(m.chronicle)
      ? m.chronicle.filter((c) => c && typeof c.msg === 'string')
          .map((c) => ({ t: n(c.t, Date.now()), msg: c.msg })).slice(-200)
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
    // transient interactive objects are validated/cleared by their callers
    m.pendingChoice = (m.pendingChoice && typeof m.pendingChoice === 'object') ? m.pendingChoice : null;
    m.raid = Object.assign({ active: false, returnsAt: 0, target: null }, m.raid);
    m.raid.active = bool(m.raid.active);
    m.raid.returnsAt = n(m.raid.returnsAt);
    return m;
  }
})();
