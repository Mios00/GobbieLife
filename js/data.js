/* ============================================================
 * GOBLIN: A Tale of Growth & Shenanigans
 * data.js — static game definitions & balance numbers
 *
 * Everything here is pure data. No DOM, no state mutation.
 * Tweaking the numbers here re-balances the whole game.
 * ============================================================ */
(function () {
  const GG = (window.GG = window.GG || {});

  GG.CONFIG = {
    tickMs: 1000,            // simulation tick length
    saveKey: 'goblin_idle_save_v1',
    offlineCapHours: 8,      // max offline time credited on return
    upkeepPerGoblin: 0.03,   // mushrooms/sec eaten per goblin
    ambientStoryEverySec: 75, // ambient chronicle entry cadence
    raidDurationSec: 16,
    breedBaseCostMush: 12,   // mushrooms per new goblin (scales with pop)
    breedSecPerGoblin: 9,    // seconds of progress to spawn a goblin
  };

  // --- Resources -------------------------------------------------
  GG.RESOURCES = {
    mushrooms: { name: 'Mushrooms', sym: '✿', desc: 'Food. Fuel for goblins and breeding.' },
    scrap:     { name: 'Scrap',     sym: '⚒', desc: 'Salvage. Used to build almost everything.' },
    shinies:   { name: 'Shinies',   sym: '◈', desc: 'Loot & coin. Won by raiding and trading.' },
  };

  // --- Jobs (population assignments) -----------------------------
  GG.JOBS = {
    forage: { name: 'Foragers', verb: 'forage', perGoblin: 0.6, out: 'mushrooms' },
    dig:    { name: 'Diggers',  verb: 'dig',    perGoblin: 0.5, out: 'scrap' },
    raid:   { name: 'Raiders',  verb: 'raid',   perGoblin: 0,   out: null }, // used by war tent
  };

  // --- Buildings -------------------------------------------------
  // cost(level) returns the cost to buy the NEXT level (current level passed in).
  // effects are interpreted in game.js.
  GG.BUILDINGS = {
    mushroomPatch: {
      name: 'Mushroom Patch',
      blurb: 'Damp, cultivated caverns. Grows mushrooms on their own.',
      base: { scrap: 6 }, growth: 1.55,
      prod: { mushrooms: 0.5 },
    },
    scrapHeap: {
      name: 'Scrap Heap',
      blurb: 'A picked-over junk pile. Goblins love junk.',
      base: { mushrooms: 8 }, growth: 1.55,
      prod: { scrap: 0.4 },
    },
    burrow: {
      name: 'Burrow',
      blurb: 'More tunnels, more goblins. Raises your goblin cap and lets the tribe breed.',
      base: { mushrooms: 22, scrap: 16 }, growth: 1.7,
      capPlus: 3,
      unlocks: 'breeding',
      settle: 1,
    },
    warTent: {
      name: 'War Tent',
      blurb: 'Crude spears and worse manners. Unlocks raids.',
      base: { scrap: 38, mushrooms: 24 }, growth: 1.85,
      unlocks: 'raids',
      lean: { cruelty: 1 },
      settle: 1,
    },
    tradingPost: {
      name: 'Trading Post',
      blurb: 'A rickety stall on the road. Other folk start to visit... and trade.',
      base: { scrap: 34, shinies: 6 }, growth: 1.85,
      unlocks: 'trade',
      lean: { openness: 1 },
      settle: 1,
    },
    totem: {
      name: 'Totem of Tales',
      blurb: 'A carved idol that remembers. Your story is told more often, and your destiny grows clearer.',
      base: { scrap: 30, mushrooms: 30 }, growth: 2.0,
      unlocks: 'destiny',
      settle: 1,
    },
    greatHall: {
      name: 'Great Hall',
      blurb: 'The seat of something larger than a warren. Raising it brings your tale to its end.',
      base: { scrap: 220, shinies: 90, mushrooms: 160 }, growth: 3.0,
      max: 1,
      requiresChapter: 4,
      unlocks: 'finale',
      settle: 2,
    },
  };

  // --- Raid targets ---------------------------------------------
  // Each completed raid surfaces a CHOICE that nudges hidden stats.
  GG.RAID_TARGETS = [
    {
      id: 'farm',
      title: 'A Lonely Farmstead',
      text: 'Your warband returns from a turnip farm at the wood\'s edge. The farmer and his family are hiding in the cellar.',
      options: [
        { label: 'Pillage it bare', loot: { shinies: [6, 12], mushrooms: [10, 20] }, lean: { greed: 2, cruelty: 2 },
          log: 'The warband stripped the farmstead to its beams. Smoke and laughter trailed them home.' },
        { label: 'Shake them down for coin', loot: { shinies: [4, 8] }, lean: { greed: 2, openness: 1 },
          log: 'You let the farmer keep his roof — for a price, paid yearly. A goblin "tax man" is a novel thing.' },
        { label: 'Leave them be, take the road', loot: { shinies: [1, 3] }, lean: { openness: 2, wanderlust: 1 },
          log: 'You waved the warband off. There were bigger, stranger places down the road than a turnip farm.' },
      ],
    },
    {
      id: 'caravan',
      title: 'A Merchant Caravan',
      text: 'Wheels in the dark. A merchant caravan — guards dozing, lockboxes heavy.',
      options: [
        { label: 'Ambush and slaughter', loot: { shinies: [14, 24], scrap: [10, 18] }, lean: { greed: 2, cruelty: 3 },
          log: 'No guard left to tell of it. The lockboxes were everything you hoped.' },
        { label: 'Rob, but spare the drivers', loot: { shinies: [10, 16], scrap: [6, 10] }, lean: { greed: 2 },
          log: 'You took the gold and gave them back their boots. Strange mercy travels fast.' },
        { label: 'Strike a deal instead', loot: { shinies: [5, 9] }, lean: { openness: 3 },
          log: 'You traded threat for partnership. The merchant now sells your mushrooms two valleys over.' },
      ],
    },
    {
      id: 'village',
      title: 'A Frontier Village',
      text: 'A whole village of the tall folk — mills, a militia, a chapel bell already ringing.',
      options: [
        { label: 'Burn it to the roots', loot: { shinies: [20, 34] }, risk: 0.25, lean: { cruelty: 4, greed: 2 },
          log: 'Ash where a village stood. Some goblins did not come home, but the tale of it spread for miles.' },
        { label: 'Conquer and rule them', loot: { shinies: [12, 20], scrap: [14, 22] }, risk: 0.15, lean: { cruelty: 2, greed: 1 },
          log: 'You did not destroy the village. You took it. The tall folk bow to a goblin lord now.' },
        { label: 'Offer them protection (for tribute)', loot: { shinies: [8, 14] }, lean: { openness: 2, greed: 1 },
          log: 'You named yourself their shield against worse things than you. They half-believe it. So do you.' },
      ],
    },
    {
      id: 'ruin',
      title: 'A Wizard\'s Ruin',
      text: 'A collapsed tower humming with old magic and older dust. No one to fight — only choices.',
      options: [
        { label: 'Loot every cursed thing', loot: { shinies: [16, 28], scrap: [8, 14] }, lean: { greed: 3, wanderlust: 1 },
          log: 'You hauled out armfuls of glittering, humming junk. A few goblins now glow faintly. Worth it.' },
        { label: 'Take only what you understand', loot: { shinies: [7, 12] }, lean: { wanderlust: 2 },
          log: 'You left the dangerous wonders sleeping. The road out felt longer, and you liked that.' },
        { label: 'Bring a scholar back to study it', loot: { shinies: [3, 6] }, lean: { openness: 3, wanderlust: 1 },
          log: 'You returned with a wide-eyed elf scholar who calls your warren "a remarkable culture." Goblins are unsure how to feel.' },
      ],
    },
  ];

  // --- Chapter milestones ---------------------------------------
  // Advancing a chapter is what triggers story + (eventually) the finale.
  GG.CHAPTERS = [
    { req: { buildings: 1 },                       title: 'I — A Hole in the World' },
    { req: { population: 4 },                       title: 'II — The Warren Wakes' },
    { req: { buildingsDistinct: 3 },               title: 'III — Word Gets Around' },
    { req: { shiniesTotal: 60 },                   title: 'IV — Reputation' },
    { req: { settle: 6 },                          title: 'V — Something Larger' },
    { req: { greatHall: 1 },                        title: 'VI — The Reckoning' },
  ];

  // --- Endings ---------------------------------------------------
  // The finale picks the ending with the highest score from current stats.
  // (Defined as a function so it can read the whole state.)
  GG.ENDINGS = {
    purist: {
      name: 'The Pure Warren',
      score: (s) => s.settle * 1.0 + s.stats.cruelty * 0.8 + s.stats.greed * 0.5 - s.stats.openness * 2.2 + (s.buildings.greatHall ? 6 : 0),
    },
    multirace: {
      name: 'The Motley Kingdom',
      score: (s) => s.settle * 1.0 + s.stats.openness * 2.0 + s.tradeCount * 0.6 - s.stats.cruelty * 1.0 + (s.buildings.greatHall ? 6 : 0),
    },
    chaos: {
      name: 'The Endless Road',
      score: (s) => s.stats.wanderlust * 2.2 + s.raidCount * 0.8 - s.settle * 1.2,
    },
    villain: {
      name: 'The Goblin That Loomed',
      score: (s) => s.stats.cruelty * 1.6 + s.stats.greed * 1.2 + s.raidCount * 0.4 - s.stats.openness * 1.6,
    },
  };
})();
