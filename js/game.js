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
  function newState() {
    const legend = GG.Story.makeLegend();
    return {
      version: 1,
      startedAt: Date.now(),
      lastSeen: Date.now(),
      name: legend.name,
      legendIntro: legend.intro.replace('#NAME#', legend.name),

      resources: { mushrooms: 0, scrap: 0, shinies: 0 },
      totals: { shiniesTotal: 0 }, // lifetime, for milestones

      population: 1,
      jobs: { forage: 0, dig: 0, raid: 0 },

      buildings: {
        mushroomPatch: 0, scrapHeap: 0, burrow: 0,
        warTent: 0, tradingPost: 0, totem: 0, greatHall: 0,
      },

      stats: { greed: 0, cruelty: 0, openness: 0, wanderlust: 0 },
      settle: 0,           // how "rooted" you are (from building)
      raidCount: 0,
      tradeCount: 0,

      unlocks: { breeding: false, raids: false, trade: false, destiny: false, finale: false },

      chapter: 0,
      breedProgress: 0,
      raid: { active: false, returnsAt: 0, target: null },
      pendingChoice: null, // {title,text,options}

      chronicle: [],
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

  // ---- verbs ----------------------------------------------------
  function note(s, msg) {
    s.log.unshift(msg);
    if (s.log.length > 4) s.log.length = 4;
  }
  function chronicle(s, msg) {
    s.chronicle.push({ t: Date.now(), msg });
    if (s.chronicle.length > 200) s.chronicle.shift();
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

  Game.build = function (s, id) {
    const def = GG.BUILDINGS[id];
    if (def.requiresChapter && s.chapter < def.requiresChapter) return false;
    const cost = Game.buildingCost(s, id);
    if (!Game.canAfford(s, cost)) return false;
    for (const res in cost) s.resources[res] -= cost[res];
    s.buildings[id] += 1;

    if (def.unlocks) s.unlocks[def.unlocks] = true;
    if (def.settle) s.settle += def.settle;
    if (def.lean) for (const k in def.lean) s.stats[k] += def.lean[k];

    note(s, 'Built ' + def.name + '.');
    // first-time-built gets a chronicle beat
    if (s.buildings[id] === 1) {
      chronicle(s, firstBuildLine(id));
    }
    if (id === 'greatHall') Game.finish(s);
    return true;
  };

  function firstBuildLine(id) {
    const lines = {
      mushroomPatch: 'You coax the first patch of mushrooms into rows. Farming. A goblin, farming. The mushrooms seem as surprised as you are.',
      scrapHeap: 'You start a proper scrap heap. Goblins arrive to admire it like art. It is, to them, art.',
      burrow: 'You dig new burrows. That night, for the first time, the warren is too crowded to feel alone.',
      warTent: 'You raise a war tent of hide and spite. The young goblins sharpen things. Something is coming, and it will be you.',
      tradingPost: 'You prop up a trading post on the road. The first traveller flinches, then haggles. Commerce, it turns out, is louder than war and almost as fun.',
      totem: 'You carve a totem that "remembers." Goblins tell it their day. It tells you your destiny, a little clearer each time.',
      greatHall: 'The Great Hall rises, beam by impossible beam. Every goblin you ever recruited stands in its shadow. This is the end of one tale and, you suspect, the start of a legend.',
    };
    return lines[id] || 'Something new stands in the warren.';
  }

  // ---- breeding (passive population growth) --------------------
  function breedCost(s) {
    return Math.ceil(C.breedBaseCostMush * Math.pow(1.25, s.population - 1));
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
  function resolveRaid(s) {
    const tgt = s.raid.target;
    s.raid = { active: false, returnsAt: 0, target: null };
    s.raidCount += 1;
    // surface the choice to the player
    s.pendingChoice = {
      title: tgt.title,
      text: tgt.text,
      options: tgt.options.map((o) => ({ ...o })),
      _raiders: s.jobs.raid,
    };
  }

  // player resolves a raid choice
  Game.resolveChoice = function (s, optIndex) {
    if (!s.pendingChoice) return;
    const opt = s.pendingChoice.options[optIndex];
    const raiders = s.pendingChoice._raiders || 1;
    // loot scales mildly with raider count
    const mult = 1 + (raiders - 1) * 0.25;
    if (opt.loot) {
      for (const res in opt.loot) {
        const [lo, hi] = opt.loot[res];
        const amt = Math.round((lo + Math.random() * (hi - lo)) * mult);
        s.resources[res] += amt;
        if (res === 'shinies') s.totals.shiniesTotal += amt;
      }
    }
    if (opt.lean) for (const k in opt.lean) s.stats[k] += opt.lean[k];
    // risky options can cost a goblin
    if (opt.risk && Math.random() < opt.risk && s.population > 1) {
      s.population -= 1;
      // pull from raiders first
      if (s.jobs.raid > 0) s.jobs.raid -= 1;
      note(s, 'A goblin did not come home.');
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
      chronicle(s, '— ' + GG.Story.herald(s.chapter) + ' —');
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
    s.ending = { id, name: GG.ENDINGS[id].name, text: GG.Story.finale(id) };
    chronicle(s, '════ THE END ════');
  };

  // ---- master tick ---------------------------------------------
  Game.tick = function (s, dtSec) {
    if (s.ending) return; // game over, world frozen
    const r = Game.rates(s);
    s.resources.mushrooms = Math.max(0, s.resources.mushrooms + r.mushrooms * dtSec);
    s.resources.scrap = Math.max(0, s.resources.scrap + r.scrap * dtSec);

    tickBreeding(s, dtSec);

    if (s.raid.active && Date.now() >= s.raid.returnsAt) {
      resolveRaid(s);
    }

    tickStory(s, dtSec);
    checkChapters(s);
    s.lastSeen = Date.now();
  };

  // ---- offline catch-up ----------------------------------------
  Game.applyOffline = function (s) {
    const now = Date.now();
    let dt = (now - s.lastSeen) / 1000;
    if (dt < 5) return 0;
    const capped = Math.min(dt, C.offlineCapHours * 3600);
    const r = Game.rates(s);
    s.resources.mushrooms = Math.max(0, s.resources.mushrooms + r.mushrooms * capped);
    s.resources.scrap = Math.max(0, s.resources.scrap + r.scrap * capped);
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
    return merged;
  }
})();
