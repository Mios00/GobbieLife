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
    ambientStoryEverySec: 45, // ambient chronicle entry cadence (faster = richer history)
    oracleEverySec: 100,     // how often the Totem utters an Oracle riddle
    worldNewsEverySec: 130,  // how often a caravan/wanderer brings news of the wider world
    reckoningStageSec: 18,   // seconds between beats of the endgame act (The Reckoning)
    lifespanMinSec: 3000,    // protagonist lifespan (active play): min + up to +var
    lifespanVarSec: 2400,
    cometMinSec: 3600,       // the Comet / Prophesied Year countdown (active play)
    cometVarSec: 3600,
    renownEverySec: 30,      // how often your legend (renown) ticks up
    raidDurationSec: 16,
    breedBaseCostMush: 6,    // mushrooms per new goblin (scales with pop) — cheap, breed a big tribe
    breedScale: 1.15,        // per-goblin breed-cost growth (gentler so large warrens stay viable)
    breedSecPerGoblin: 9,    // seconds of progress to spawn a goblin
    eventMinSec: 45,         // soonest a random event can interrupt (more frequent now)
    eventMaxSec: 95,         // latest before one is guaranteed
  };

  // --- Resources -------------------------------------------------
  GG.RESOURCES = {
    mushrooms: { name: 'Mushrooms', sym: '✿', desc: 'Food. Fuel for goblins and breeding.' },
    scrap:     { name: 'Scrap',     sym: '⚒', desc: 'Salvage. Used to build almost everything.' },
    shinies:   { name: 'Shinies',   sym: '◈', desc: 'Loot & coin. Won by raiding and trading.' },
  };

  // --- Jobs (population assignments) -----------------------------
  // Per-goblin output is deliberately small: it takes ~3× the goblins to move
  // the needle, so the game is about growing a big tribe (and breeding is cheap).
  GG.JOBS = {
    forage: { name: 'Foragers', verb: 'forage', perGoblin: 0.2,  out: 'mushrooms' },
    dig:    { name: 'Diggers',  verb: 'dig',    perGoblin: 0.17, out: 'scrap' },
    raid:   { name: 'Raiders',  verb: 'raid',   perGoblin: 0,    out: null }, // used by war tent
  };

  // --- Other races (join your tribe, become a productive population) ---
  // Goblins are bred and assigned to jobs; other races arrive via openness-y
  // events/raids and quietly contribute their specialty each second. They also
  // eat (upkeep on the WHOLE settlement), so a mixed kingdom must feed itself.
  GG.RACES = {
    dwarf: { name: 'Dwarves', one: 'dwarf',  sym: '⛏', bonus: { scrap: 0.25 },
             blurb: 'Tireless smiths and miners. Scrap flows where they work.' },
    human: { name: 'Humans',  one: 'human',  sym: '⌂', bonus: { mushrooms: 0.28 },
             blurb: 'Farmers and bakers. They keep the whole tribe fed.' },
    elf:   { name: 'Elves',   one: 'elf',    sym: '❧', bonus: { shinies: 0.06 },
             blurb: 'Lore-keepers and traders. Their quiet presence enriches the warren.' },
  };

  // --- Factions (the powers of the world) -----------------------
  // Per-faction standing runs -100 (Despised) .. +100 (Allied). Goblins start
  // despised by almost everyone. Knowledge is GRADUAL: most factions are
  // unknown until the world opens up (progression now; exploration/news later),
  // at which point `Game.discoverFaction` reveals them. Only the few nearest
  // powers are known from the start.
  GG.FACTIONS = {
    aldermere:   { name: 'the Kingdom of Aldermere', kind: 'human',  baseStanding: -55, startKnown: true,
                   rumor: 'a proud human kingdom that has never had a kind word for goblinkind.' },
    beastwilds:  { name: 'the Beast-Wilds',          kind: 'beast',  baseStanding: -70, startKnown: true,
                   rumor: 'the howling wilds at your doorstep, where nothing negotiates and everything is hungry.' },
    snaggletooth:{ name: 'the Snaggletooth Warren',  kind: 'goblin', baseStanding: -15, startKnown: true,
                   rumor: 'a rival goblin warren two valleys over — kin, of a sort, and rivals, of a certainty.' },
    tannard:     { name: 'the Free City of Tannard',  kind: 'merchant', baseStanding: -30,
                   rumor: 'a bustling merchant city where, they say, coin matters more than blood.' },
    karzun:      { name: 'the Deephold of Karzun',    kind: 'dwarf',  baseStanding: -40,
                   rumor: 'a dwarven hold deep under the mountains, all hammers and suspicion.' },
    aelinvar:    { name: 'the Sylvan Court of Aelinvar', kind: 'elf', baseStanding: -45,
                   rumor: 'an aloof elven court that regards almost everyone as a passing inconvenience.' },
    gorefist:    { name: 'the Gorefist Horde',        kind: 'orc',    baseStanding: -35,
                   rumor: 'a roving orc horde that respects exactly one thing, and it is not words.' },
    gilded:      { name: 'the Gilded League',         kind: 'merchant', baseStanding: -25,
                   rumor: 'a sprawling trade league of gnomes and halflings who will deal with anyone solvent.' },
    mournhollow: { name: 'the Barony of Mournhollow', kind: 'undead', baseStanding: -50,
                   rumor: 'a fog-bound barony where the dead are said to keep working long after they should stop.' },
    thornveil:   { name: 'the Thornveil Court',       kind: 'fey',    baseStanding: -40,
                   rumor: 'a fey court behind the hawthorn, where the rules are many, unwritten, and lethal.' },
    ssirvax:     { name: 'Ssirvax\'s Reach',          kind: 'dragon', baseStanding: -60,
                   rumor: 'the domain of a long-lived dragon who counts everything, and forgets nothing.' },
  };

  // standing tiers (low → high). Game.standingTier maps a value to one of these.
  GG.STANDING_TIERS = [
    { at: -100, name: 'Despised' },
    { at: -55,  name: 'Distrusted' },
    { at: -20,  name: 'Wary' },
    { at: 15,   name: 'Tolerated' },
    { at: 45,   name: 'Respected' },
    { at: 75,   name: 'Trusted' },
    { at: 95,   name: 'Allied' },
  ];

  // --- Notable goblins (a Dwarf-Fortress-ish roster of named individuals) ---
  // A handful of goblins stand out from the crowd, each with a personality.
  // They age on a randomised natural lifespan, do trait-flavoured things that
  // touch the Chronicle (and sometimes the hoard), and eventually die — in
  // battle, or old and full of years — while new ones rise to take their place.
  GG.NOTABLE = {
    names: ['Murt', 'Skrik', 'Pim', 'Hobnail', 'Veen', 'Klud', 'Bog', 'Wretcha',
            'Snek', 'Grad', 'Ugzul', 'Nix', 'Drub', 'Fenn', 'Gort', 'Hazia',
            'Brak', 'Lumpkin', 'Sproggit', 'Yarl', 'Mott', 'Gell'],
    roles: ['the Forager', 'the Digger', 'the Raider', 'the Tinker', 'the Cook',
            'the Shaman', 'the Lookout', 'the Brewer', 'the Storyteller'],
    traits: [
      { id: 'greedy',   adj: 'Greedy',   act: 'pockets a few shinies "for safekeeping."',                 gain: { shinies: [1, 4] },  lean: { greed: 1 } },
      { id: 'brave',    adj: 'Brave',    act: 'picks a fight with something twice their size — and wins.', lean: { cruelty: 1 } },
      { id: 'kind',     adj: 'Kind',     act: 'shares their dinner with a stray, who decides to stay.',    lean: { openness: 1 } },
      { id: 'restless', adj: 'Restless', act: 'vanishes down the road for a day and returns full of stories.', lean: { wanderlust: 1 } },
      { id: 'clumsy',   adj: 'Clumsy',   act: 'knocks the scrap pile clean over. Again.',                  gain: { scrap: [-4, -1] } },
      { id: 'clever',   adj: 'Clever',   act: 'invents a slightly better way to do a tiresome thing.',     gain: { mushrooms: [2, 6] } },
      { id: 'grumpy',   adj: 'Grumpy',   act: 'starts a feud over nothing. It mostly resolves by morning.' },
      { id: 'lucky',    adj: 'Lucky',    act: 'finds something shiny in the mud, as they somehow always do.', gain: { shinies: [2, 6] } },
      { id: 'devout',   adj: 'Devout',   act: 'spends the night muttering to the Totem. It mutters back.',  lean: {} },
    ],
  };

  // --- Buildings -------------------------------------------------
  // cost(level) returns the cost to buy the NEXT level (current level passed in).
  // effects are interpreted in game.js.
  // `revealPop`: the build option stays hidden until your tribe has *peaked* at
  // this many goblins — so the build menu unfolds gradually as the warren grows
  // rather than dumping every option at once. (Default 0 = always available.)
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
      base: { mushrooms: 12, scrap: 9 }, growth: 1.6,
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
      revealPop: 4,
    },
    tradingPost: {
      name: 'Trading Post',
      blurb: 'A rickety stall on the road. Other folk start to visit... and trade.',
      base: { scrap: 34, shinies: 6 }, growth: 1.85,
      unlocks: 'trade',
      lean: { openness: 1 },
      settle: 1,
      revealPop: 5,
    },
    lookout: {
      name: 'Lookout Warren',
      blurb: 'Sharp-eyed sentries watch the dark. Raids go better and nasty surprises come less often.',
      base: { scrap: 30, mushrooms: 20 }, growth: 1.8,
      needs: 'raids',
      settle: 1,
      revealPop: 6,
    },
    brewery: {
      name: 'Mushroom Brewery',
      blurb: 'Goblins ferment spare mushrooms into a potent ale the tall folk pay dearly for. Slow, steady coin.',
      base: { scrap: 44, mushrooms: 40 }, growth: 1.7,
      prod: { shinies: 0.12, mushrooms: -0.35 },
      needs: 'trade',
      lean: { openness: 1 },
      settle: 1,
      revealPop: 8,
    },
    totem: {
      name: 'Totem of Tales',
      blurb: 'A carved idol that remembers. Your story is told more often, and your destiny grows clearer.',
      base: { scrap: 30, mushrooms: 30 }, growth: 2.0,
      unlocks: 'destiny',
      settle: 1,
      revealPop: 10,
    },
    greatHall: {
      name: 'Great Hall',
      blurb: 'The seat of something larger than a warren. Raising it brings your tale to its end.',
      base: { scrap: 220, shinies: 90, mushrooms: 160 }, growth: 3.0,
      max: 1,
      requiresChapter: 4,
      revealPop: 12,
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
      silly: {
        title: 'A Suspiciously Sentient Farm',
        text: 'Your warband returns from a turnip farm. The turnips had opinions. The turnips had DEMANDS. The family is hiding in the cellar, which is, honestly, the most sensible thing anyone has done today.',
        options: [
          { label: 'Found a tiny turnip republic', loot: { shinies: [6, 12], mushrooms: [10, 20] }, lean: { greed: 2, cruelty: 2 },
            log: 'You declared the field a sovereign nation. Its flag is a sock. Two kingdoms have recognized it. You are, as of this morning, at war with both.' },
          { label: 'Become the farmer\'s life coach', loot: { shinies: [4, 8] }, lean: { greed: 2, openness: 1 },
            log: 'You didn\'t rob him — you restructured his entire worldview over one intense evening. He\'s "finding himself" now. You take 40% as a finder\'s fee for the self.' },
          { label: 'Steal the actual cellar', loot: { shinies: [1, 3] }, lean: { openness: 2, wanderlust: 1 },
            log: 'Not the family. The cellar. The literal cellar. Nobody knows how. The family live in your warren now and are unsure whether they are hostages or roommates. So are you.' },
        ],
      },
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
        { label: 'Strike a deal instead', loot: { shinies: [5, 9] }, lean: { openness: 3 }, standing: { tannard: 4, gilded: 2 },
          log: 'You traded threat for partnership. The merchant now sells your mushrooms two valleys over — and word of a goblin you can do business with travels with him.' },
      ],
      silly: {
        title: 'A Caravan With A Loyalty Program',
        text: 'Wheels in the dark. A merchant caravan — the guards are unionized and on break, and the lockboxes appear to run on a subscription model.',
        options: [
          { label: 'Cancel their subscription violently', loot: { shinies: [14, 24], scrap: [10, 18] }, lean: { greed: 2, cruelty: 3 },
            log: 'You ended the subscription with extreme prejudice. The lockboxes were everything the brochure promised and more.' },
          { label: 'Become a satisfied returning customer', loot: { shinies: [10, 16], scrap: [6, 10] }, lean: { greed: 2 },
            log: 'You robbed them so politely they gave you a loyalty card. The tenth robbery is free. You are, against your will, a little touched.' },
          { label: 'Pivot to a strategic partnership', loot: { shinies: [5, 9] }, lean: { openness: 3 },
            log: 'You traded menace for a merger. The merchant now distributes your mushroom ale two valleys over. The word, apparently, is "synergy."' },
        ],
      },
    },
    {
      id: 'village',
      title: 'A Frontier Village',
      text: 'A whole village of the tall folk — mills, a militia, a chapel bell already ringing.',
      options: [
        { label: 'Burn it to the roots', loot: { shinies: [20, 34] }, risk: 0.25, lean: { cruelty: 4, greed: 2 }, standing: { aldermere: -8 },
          log: 'Ash where a village stood. Some goblins did not come home, but the tale of it spread for miles. The Kingdom of Aldermere will remember this one.' },
        { label: 'Conquer and rule them', loot: { shinies: [12, 20], scrap: [14, 22] }, risk: 0.15, lean: { cruelty: 2, greed: 1 },
          log: 'You did not destroy the village. You took it. The tall folk bow to a goblin lord now.' },
        { label: 'Offer them protection (for tribute)', loot: { shinies: [8, 14] }, lean: { openness: 2, greed: 1 },
          log: 'You named yourself their shield against worse things than you. They half-believe it. So do you.' },
      ],
      silly: {
        title: 'A Frontier Village With A Newsletter',
        text: 'A whole village of the tall folk — mills, a militia, a chapel bell, and a surprisingly active community newsletter that already mentions you by name, mostly in the complaints section.',
        options: [
          { label: 'Get cancelled, then burn it down', loot: { shinies: [20, 34] }, risk: 0.25, lean: { cruelty: 4, greed: 2 },
            log: 'You answered your bad press with fire. The newsletter\'s final issue was, everyone agreed, its strongest work.' },
          { label: 'Run for mayor (unopposed, suddenly)', loot: { shinies: [12, 20], scrap: [14, 22] }, risk: 0.15, lean: { cruelty: 2, greed: 1 },
            log: 'You did not conquer the village. You won a landslide election nobody recalls holding. The tall folk call you "Your Honour" now, very nervously.' },
          { label: 'Offer "protection" (it is an MLM)', loot: { shinies: [8, 14] }, lean: { openness: 2, greed: 1 },
            log: 'You named yourself their shield against worse goblins. There are no worse goblins. They pay monthly, and some have alarmingly started recruiting.' },
        ],
      },
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
        { label: 'Bring a scholar back to study it', loot: { shinies: [3, 6] }, lean: { openness: 3, wanderlust: 1 }, race: { elf: 1 },
          log: 'You returned with a wide-eyed elf scholar who calls your warren "a remarkable culture." Goblins are unsure how to feel. The elf, at least, has decided to stay.' },
      ],
      silly: {
        title: 'A Wizard\'s Ruin (Now A Pop-Up Shop)',
        text: 'A collapsed tower humming with old magic and a hand-painted sign: "EVERYTHING MUST GO." No one to fight. Only choices, and several impulse purchases.',
        options: [
          { label: 'Buy every cursed thing on clearance', loot: { shinies: [16, 28], scrap: [8, 14] }, lean: { greed: 3, wanderlust: 1 },
            log: 'You hauled out armfuls of humming junk. Several goblins now glow. One can see next Tuesday. He refuses to elaborate. Worth it.' },
          { label: 'Only take what has a return policy', loot: { shinies: [7, 12] }, lean: { wanderlust: 2 },
            log: 'You left the dangerous wonders sleeping. The road out felt longer, and you found yourself quietly appreciating the warranty implications.' },
          { label: 'Adopt the wizard\'s ghost as an intern', loot: { shinies: [3, 6] }, lean: { openness: 3, wanderlust: 1 },
            log: 'You returned with a translucent intern who calls your warren "a vibrant disruptor." The goblins do not know what that means. Neither, you suspect, does he.' },
        ],
      },
    },
    {
      id: 'minecart',
      title: 'A Runaway Mine Cart',
      text: 'A dwarven ore cart has jumped its rails and lies on its side in the gully, axles still spinning. No dwarves yet — but you can hear hammers in the deep.',
      options: [
        { label: 'Strip the cart and run', loot: { scrap: [18, 30], shinies: [6, 10] }, lean: { greed: 2, wanderlust: 1 },
          log: 'You hauled off every bolt and ingot before the first dwarf reached the surface. They are still cursing your name in three dialects.' },
        { label: 'Right the cart and roll it home whole', loot: { scrap: [12, 20], shinies: [10, 16] }, risk: 0.2, lean: { greed: 3 },
          log: 'Getting the whole cart back took muscle and a few crushed toes, but a dwarven cart is worth a heap of bent scrap.' },
        { label: 'Wait, and return it for a reward', loot: { shinies: [9, 15] }, lean: { openness: 3 }, race: { dwarf: 1 },
          log: 'You sat on the cart and waved when the dwarves arrived. Baffled, grateful, suspicious — they paid you anyway. One dwarf, impressed by the sheer nerve of it, stays on to tinker in your deeps.' },
      ],
      silly: {
        title: 'A Runaway Mine Cart (No Brakes, Big Mood)',
        text: 'A dwarven ore cart has jumped its rails, wheels still spinning, going absolutely nowhere at top speed. You can hear hammers below, and what might be a dwarven HR complaint being drafted in real time.',
        options: [
          { label: 'Strip it for parts and a cool story', loot: { scrap: [18, 30], shinies: [6, 10] }, lean: { greed: 2, wanderlust: 1 },
            log: 'You stripped the cart before the first dwarf surfaced. They are cursing your name in three dialects and one interpretive dance.' },
          { label: 'Launch a competing cart startup', loot: { scrap: [12, 20], shinies: [10, 16] }, risk: 0.2, lean: { greed: 3 },
            log: 'You rolled the whole cart home and founded "Cart, But Goblin." Disruptive. Deeply litigious. Surprisingly profitable.' },
          { label: 'Return it for the reward and the clout', loot: { shinies: [9, 15] }, lean: { openness: 3 }, race: { dwarf: 1 },
            log: 'You returned the cart, waved, and accepted a reward, a baffled dwarven friendship, and one dwarf who moves into your deeps to "keep an eye on the structural integrity."' },
        ],
      },
    },
    {
      id: 'hoard',
      title: 'A Sleeping Wyrm\'s Hoard',
      text: 'Down a scorched ravine lies a young dragon, curled on a mound of gold the size of a hill. Its breath stirs the coins. It is, for now, asleep.',
      options: [
        { label: 'Take it all and wake the beast', loot: { shinies: [40, 70], scrap: [10, 20] }, risk: 0.45, lean: { greed: 4, cruelty: 2 },
          log: 'You took everything and the sky turned to fire behind you. Some goblins are ash now, but the survivors are RICH, and the tale of it will outlive everyone who heard it.' },
        { label: 'Skim the edges and slip away', loot: { shinies: [16, 26] }, risk: 0.1, lean: { greed: 2, wanderlust: 2 },
          log: 'You took only what you could carry quietly and were a ridge away before the wyrm so much as snored. Patience, you decide, is just greed that lives longer.' },
        { label: 'Wake it gently and... talk', loot: { shinies: [8, 14] }, risk: 0.15, lean: { openness: 4, wanderlust: 1 },
          log: 'Nobody talks to dragons. You did. It found a goblin\'s nerve so funny it let you leave with a gift and an open invitation. The warren now has, technically, a dragon contact.' },
      ],
      silly: {
        title: 'A Sleeping Wyrm (Do Not Perceive It)',
        text: 'Down a scorched ravine, a young dragon naps on a hill of gold. The dream is, by the snoring, going great. The coins shift like a very expensive ASMR video.',
        options: [
          { label: 'Take it all, start a beef with a dragon', loot: { shinies: [40, 70], scrap: [10, 20] }, risk: 0.45, lean: { greed: 4, cruelty: 2 },
            log: 'You took everything and the sky turned to fire. Some goblins are ash now. The survivors are RICH and the group chat is, frankly, unhinged.' },
          { label: 'Skim the edges like a coward genius', loot: { shinies: [16, 26] }, risk: 0.1, lean: { greed: 2, wanderlust: 2 },
            log: 'You took only what you could carry quietly and were a ridge away before it snored again. Patience, you decide, is just greed with a longer fuse.' },
          { label: 'Network with the dragon', loot: { shinies: [8, 14] }, risk: 0.15, lean: { openness: 4, wanderlust: 1 },
            log: 'Nobody networks with dragons. You did. It found your nerve hilarious and gave you its card. The warren has a dragon contact now. LinkedIn is shaking.' },
        ],
      },
    },
  ];

  // --- Random events --------------------------------------------
  // These interrupt play on a timer (see CONFIG.eventMin/MaxSec). Two kinds:
  //   • CHOICE events have `options` (same schema as raid options, plus
  //     `give`/`cost`/`pop`) and surface in the modal.
  //   • AUTO events have no options — they apply `effect` and drop a line in
  //     the Chronicle without stealing focus.
  // `when(s)` gates eligibility; `weight` biases selection; `bad:true` events
  // are made rarer by each Lookout Warren.
  GG.EVENTS = [
    // ---- auto / ambient surprises ----
    {
      id: 'shinyFind', weight: 3,
      when: () => true,
      text: 'A goblin trips, swears, and comes up clutching a fistful of coins someone buried and forgot. Finders keepers.',
      effect: { give: { shinies: 5 }, lean: { greed: 1 } },
      silly: { text: 'A goblin trips, swears creatively in three languages, and surfaces clutching coins someone buried and forgot. The law, out here, is at best a strongly-worded suggestion.' },
    },
    {
      id: 'goodHarvest', weight: 2,
      when: (s) => s.buildings.mushroomPatch > 0,
      text: 'The patches come in fat and strange this season. The whole warren eats well and naps in a pile.',
      effect: { give: { mushrooms: 25 } },
      silly: { text: 'The patches come in fat, faintly glowing, and humming the chorus of a song nobody taught them. The warren eats well and naps in a deeply suspicious pile.' },
    },
    {
      id: 'scrapVein', weight: 2,
      when: (s) => s.buildings.scrapHeap > 0,
      text: 'A digger breaks through into an old, forgotten dump — a whole seam of glorious junk.',
      effect: { give: { scrap: 22 }, lean: { greed: 1 } },
      silly: { text: 'A digger breaks into an ancient dump and screams with pure joy. It is a SEAM of world-class junk. He has named it. He will not tell you the name. It is, he says, "between him and the junk."' },
    },
    {
      id: 'strayGoblin', weight: 2,
      when: (s) => s.unlocks.breeding && s.population < (2 + s.buildings.burrow * 3),
      text: 'A muddy stranger wanders in from the dark, eats your dinner without asking, and is somehow already one of you.',
      effect: { pop: 1 },
      silly: { text: 'A muddy stranger wanders in, eats your dinner without eye contact, and is somehow already on the roster, the payroll, and two separate group chats.' },
    },
    {
      id: 'mushRot', weight: 1, bad: true,
      when: (s) => s.resources.mushrooms > 30,
      text: 'A grey rot sweeps the stores overnight. A good portion of the mushroom hoard is fit only for the rubbish heap.',
      effect: { take: { mushrooms: 0.25 } }, // fraction
      silly: { text: 'A grey rot sweeps the stores overnight. A chunk of the mushroom hoard is now, technically, abstract art. A goblin attempts to sell it as abstract art. He makes nothing. The rot remains.' },
    },

    // ---- choice events ----
    {
      id: 'bard', weight: 2,
      when: (s) => s.chapter >= 1,
      title: 'A Wandering Bard',
      text: 'A bard with more nerve than sense asks to spend the night and "collect your saga." He will sing of you, for better or worse.',
      options: [
        { label: 'Tell him everything (and feed him)', cost: { mushrooms: 10 }, lean: { openness: 2, wanderlust: 1 },
          log: 'The bard left fat and full of your stories. Somewhere out there, taverns are now singing about a goblin, and getting half of it wrong in flattering ways.' },
        { label: 'Rob him of his coin and his lute', give: { shinies: 7 }, lean: { greed: 2, cruelty: 1 },
          log: 'You took the bard\'s purse and his lute. He left with a new song, and it is not a kind one, and you do not care.' },
        { label: 'Send him on his way', lean: { wanderlust: 1 },
          log: 'You watched the bard go. Some stories, you decide, are better not told. Or not yet.' },
      ],
      silly: {
        title: 'A Bard, Allegedly',
        text: 'A man insists he is a famous bard. His "lute" is a roof tile. He says he will make you immortal. He has a 1-star review nailed to his chest that he has, mercifully, never read.',
        options: [
          { label: 'Commission an EPIC about your puddle', cost: { mushrooms: 10 }, lean: { openness: 2, wanderlust: 1 },
            log: 'A 47-verse ballad about the puddle. Verse 31 is just him crying. You are now "the puddle guy" in four kingdoms and will never, ever escape it.' },
          { label: 'Hire him. Not as a bard. As a problem.', give: { shinies: 7 }, lean: { greed: 2, cruelty: 1 },
            log: 'He is on payroll now. His job title is "vibes." He has caused three diplomatic incidents and one excellent harvest. Net positive unclear; he refuses to clarify.' },
          { label: 'Review the reviewer', lean: { wanderlust: 1 },
            log: 'You read his 1-star review aloud. It was about a different bard. He leaves to find and fight that bard. You have accidentally started the Bard Wars.' },
        ],
      },
    },
    {
      id: 'refugees', weight: 2,
      when: (s) => s.chapter >= 2,
      title: 'Strangers at the Treeline',
      text: 'A ragged band of the tall folk — burned out of their homes by something worse than you — huddle at the edge of your wood, asking for shelter.',
      options: [
        { label: 'Take them in', cost: { mushrooms: 18 }, lean: { openness: 3 }, race: { human: 2 },
          log: 'You let the refugees stay. They are clumsy in tunnels and terrified of the dark, but they can read, and cook, and they are loyal now in the way only the rescued are. Two human families join the warren.' },
        { label: 'Turn them away', lean: { cruelty: 1, greed: 1 },
          log: 'You sent the strangers back into the cold. The warren is for goblins. The wind that night sounded, you thought, a little like judgement.' },
        { label: 'Rob them of what little they have', give: { shinies: 5, scrap: 6 }, lean: { cruelty: 3, greed: 2 },
          log: 'They had almost nothing. You took it anyway. A goblin learns early that "almost nothing" is still "something."' },
      ],
      silly: {
        title: 'Strangers At The Treeline (With A Pitch Deck)',
        text: 'A ragged band of the tall folk, burned out by something worse than you, huddle at your wood\'s edge. Their leader has prepared a short slide presentation on why you should let them in.',
        options: [
          { label: 'Approve the pitch', cost: { mushrooms: 18 }, lean: { openness: 3 }, race: { human: 2 },
            log: 'You let them stay. They are terrible in tunnels and terrified of the dark, but they can read, cook, and make slides. Two human families onboard. Loyal in the way only the rescued ever are.' },
          { label: 'Ghost them professionally', lean: { cruelty: 1, greed: 1 },
            log: 'You said "let\'s circle back" and never circled back. The wind that night sounded a little like an unanswered follow-up email.' },
          { label: 'Acquire their startup for parts', give: { shinies: 5, scrap: 6 }, lean: { cruelty: 3, greed: 2 },
            log: 'They had almost nothing. You took it as an "acqui-hire," minus the hire. A goblin learns early that "almost nothing" is still something.' },
        ],
      },
    },
    {
      id: 'plague', weight: 1, bad: true,
      when: (s) => s.population >= 4,
      title: 'A Sickness in the Tunnels',
      text: 'A damp cough is spreading through the warren. Goblins are hardy, but this one has teeth.',
      options: [
        { label: 'Spend coin on remedies', cost: { shinies: 10 }, lean: { openness: 1 },
          log: 'You bought bitter herbs from a road-witch and the sickness broke within days. Coin, it turns out, can buy a kind of mercy.' },
        { label: 'Let the strong survive', risk: 0.6, lean: { cruelty: 2 },
          log: 'You let the sickness run its course. The warren is leaner now, and harder, and quieter in a way you try not to think about.' },
      ],
      silly: {
        title: 'A Sickness In The Tunnels (Going Viral)',
        text: 'A damp cough is trending through the warren. Goblins are hardy, but this one has real engagement numbers.',
        options: [
          { label: 'Throw shinies at the problem', cost: { shinies: 10 }, lean: { openness: 1 },
            log: 'You bought bitter herbs from a road-witch and the cough lost its audience within days. Coin, it turns out, is a kind of mercy that comes with a receipt.' },
          { label: 'Let the algorithm decide', risk: 0.6, lean: { cruelty: 2 },
            log: 'You let the cough run its course. The warren is leaner now, harder, and notably quieter about the whole affair.' },
        ],
      },
    },
    {
      id: 'gambler', weight: 2,
      when: (s) => s.unlocks.trade && s.resources.shinies >= 10,
      title: 'A Grinning Gambler',
      text: 'A stranger with too many teeth rattles a cup of bone dice. "Double your shinies," he says, "or lose the stake. Goblins love a gamble, no?"',
      options: [
        { label: 'Bet 10 shinies', cost: { shinies: 10 }, risk: 0, lean: { greed: 1 }, gamble: { res: 'shinies', stake: 10 },
          log: 'You rattled the bones with a stranger. However it fell, the warren talked about it for a week.' },
        { label: 'Flip his table instead', give: { shinies: 4 }, lean: { cruelty: 2 },
          log: 'You upended the gambler\'s table, pocketed the scattered coins, and suggested he find another wood. He agreed with startling speed.' },
        { label: 'Decline politely', lean: { openness: 1 },
          log: 'You waved the gambler off. A goblin who knows when not to bet is a rare and slightly suspicious thing.' },
      ],
      silly: {
        title: 'A Grinning Gambler (Definitely Normal Dice)',
        text: 'A stranger with too many teeth rattles a cup of bone dice. "Double your shinies," he grins, "or lose the stake. Goblins LOVE a gamble, yes? The dice are normal. The dice are SO normal."',
        options: [
          { label: 'Bet 10 shinies (the dice are normal)', cost: { shinies: 10 }, lean: { greed: 1 }, gamble: { res: 'shinies', stake: 10 },
            log: 'You rattled the definitely-normal bones. However it landed, the warren retold the tale for a week with steadily increasing inaccuracy.' },
          { label: 'Flip the table (the dice were not normal)', give: { shinies: 4 }, lean: { cruelty: 2 },
            log: 'You upended his table and pocketed a scatter of suspiciously weighted coins. He found a new wood to haunt with startling speed.' },
          { label: 'Decline like a responsible adult', lean: { openness: 1 },
            log: 'You waved him off. A goblin who knows when not to bet is rare, slightly suspicious, and almost certainly hiding something.' },
        ],
      },
    },
    {
      id: 'oldKnight', weight: 1,
      when: (s) => s.chapter >= 3,
      title: 'An Old Knight\'s Last Errand',
      text: 'A grey-bearded knight rides to your gate — not to fight, but to ask. A monster he cannot best alone is eating the next valley. He offers gold for goblin spears.',
      options: [
        { label: 'Take the contract', give: { shinies: 18 }, risk: 0.2, lean: { openness: 2, cruelty: 1 },
          log: 'Goblins and a knight, fighting the same monster. It should be a joke. Instead it is a victory, and a strange new respect, and a purse of honest gold.' },
        { label: 'Eat the knight\'s horse', give: { mushrooms: 12 }, lean: { cruelty: 3 },
          log: 'You did not take the contract. You took the horse. The knight left on foot, and the monster, presumably, is still out there. Not your problem.' },
        { label: 'Wish him luck and watch him go', lean: { wanderlust: 2 },
          log: 'You sent the old knight off to his doom or his glory. Either way, it was a good story, and good stories are their own kind of payment.' },
      ],
      silly: {
        title: 'An Old Knight\'s Side Quest',
        text: 'A grey-bearded knight rides to your gate — not to fight, but to outsource. A monster he cannot solo is eating the next valley. He offers gold for goblin spears, and also "exposure."',
        options: [
          { label: 'Accept (gold only, keep the exposure)', give: { shinies: 18 }, risk: 0.2, lean: { openness: 2, cruelty: 1 },
            log: 'Goblins and a knight, same monster, same side. It should be a joke. Instead it is a victory, a weird new respect, and a purse of honest gold.' },
          { label: 'Eat the knight\'s horse instead', give: { mushrooms: 12 }, lean: { cruelty: 3 },
            log: 'You took the horse, not the contract. The knight left on foot. The monster is presumably still hiring. Not your problem.' },
          { label: 'Wish him luck, subscribe for updates', lean: { wanderlust: 2 },
            log: 'You sent him off to doom or glory and asked him to write. It is a good story either way, and stories are their own kind of payment.' },
        ],
      },
    },
    {
      id: 'idol', weight: 1,
      when: (s) => s.unlocks.destiny,
      title: 'A Whisper from the Totem',
      text: 'The Totem of Tales has been muttering all night. At dawn it shows you, clear as cold water, a glimpse of who you are becoming. It asks, in its way, if you like what you see.',
      options: [
        { label: 'Lean into it — yes, this is who I am', lean: {}, _amplify: true,
          log: 'You looked at your reflection in the Totem and grinned. Whatever you are becoming, you reached out and took hold of it with both hands.' },
        { label: 'Recoil — this is not who I meant to be', lean: {}, _soften: true,
          log: 'You looked away from the Totem\'s mirror. A tale can still turn, you tell yourself. The road has forks yet.' },
      ],
      silly: {
        title: 'A Whisper From The Totem (Read Receipt On)',
        text: 'The Totem of Tales has been muttering all night and has now, somehow, left you on read. At dawn it shows you exactly who you are becoming, and appends a single emoji you cannot interpret.',
        options: [
          { label: 'Lean in — yes, this is the brand', lean: {}, _amplify: true,
            log: 'You looked into the Totem\'s mirror and grinned. Whatever you are becoming, you grabbed it with both hands and a rudimentary marketing plan.' },
          { label: 'Recoil — this is NOT the brand', lean: {}, _soften: true,
            log: 'You looked away from the mirror. A tale can still pivot, you tell yourself. The road has forks yet, and one of them surely has better optics.' },
        ],
      },
    },

    {
      id: 'wanderers', weight: 3,
      when: (s) => s.chapter >= 2,
      title: 'Wanderers at the Gate',
      text: 'A small, travel-worn band of the tall folk stops at your gate. They\'ve heard — to their own surprise — that this strange green place takes people in. They\'d like to stay, and work.',
      options: [
        { label: 'Welcome a dwarf smith', race: { dwarf: 1 }, lean: { openness: 2 },
          log: 'A broad, soot-stained dwarf sets up a forge in your deeps and starts turning your scrap into something worth having. The goblins watch, fascinated.' },
        { label: 'Welcome a human family', race: { human: 1 }, lean: { openness: 2 },
          log: 'A human family moves into a hollowed burrow, plants a garden where no garden should grow, and somehow the whole warren starts eating better.' },
        { label: 'Welcome an elf wanderer', race: { elf: 1 }, lean: { openness: 2 },
          log: 'A quiet elf with too many books takes a corner of the warren and fills it with maps and ledgers. Trade, somehow, gets easier with them around.' },
        { label: 'Turn them away — goblins only', lean: { cruelty: 1, greed: 1 },
          log: 'You sent the wanderers back to the cold road. The warren stays green, top to bottom. The Totem, you notice, is very quiet about it.' },
      ],
      silly: {
        title: 'Applicants',
        text: 'A travel-worn band of tall folk stops at the gate clutching résumés. Word has spread that the weird green startup is "hiring and surprisingly chill about species."',
        options: [
          { label: 'Hire a dwarf (scrap dept.)', race: { dwarf: 1 }, lean: { openness: 2 },
            log: 'A dwarf sets up a forge, immediately unionizes themselves, and starts turning your junk into actual value. Headcount: +1, vibes: +forge.' },
          { label: 'Hire a human (catering)', race: { human: 1 }, lean: { openness: 2 },
            log: 'A human plants a garden in a cave, which should not work, and now the warren eats like it has standards. Standards! In a hole!' },
          { label: 'Hire an elf (logistics)', race: { elf: 1 }, lean: { openness: 2 },
            log: 'An elf with concerning amounts of books takes over logistics. Spreadsheets appear. Trade improves. Nobody is allowed to touch the spreadsheets.' },
          { label: 'Reject all applicants (goblins only)', lean: { cruelty: 1, greed: 1 },
            log: 'You ghosted the entire applicant pool. The warren stays 100% goblin. The Totem leaves you on read about it.' },
        ],
      },
    },

    // ---- negative / hardship events (made rarer by each Lookout Warren) ----
    {
      id: 'strayLost', weight: 2, bad: true,
      when: (s) => s.population >= 5,
      text: 'A goblin wanders too deep chasing a glint, and never finds the way back. The warren is one smaller, and quieter for it.',
      effect: { pop: -1 },
      silly: { text: 'A goblin left "to find himself" and did not leave a forwarding address. HR has reclassified him as "spiritually relocated." (−1 goblin)' },
    },
    {
      id: 'vermin', weight: 2, bad: true,
      when: (s) => s.resources.mushrooms > 20,
      text: 'Cave-rats get into the mushroom stores and feast. What they don\'t eat, they ruin.',
      effect: { take: { mushrooms: 0.2 } },
      silly: { text: 'Cave-rats throw a catered banquet in your mushroom stores, leave a thank-you note, and abscond. The note is, infuriatingly, polite.' },
    },
    {
      id: 'caveIn', weight: 2, bad: true,
      when: (s) => s.buildings.scrapHeap > 0,
      text: 'A tunnel gives way in the night, burying a good swathe of the scrap heap under rubble.',
      effect: { take: { scrap: 0.25 } },
      silly: { text: 'A tunnel collapses dramatically and exactly on schedule, per a prophecy nobody bothered to read. The scrap heap is now, technically, a scrap valley.' },
    },
    {
      id: 'pilfered', weight: 2, bad: true,
      when: (s) => s.resources.shinies > 15,
      text: 'You wake to a clutch of shinies gone — an inside job, or a very brave magpie. No one confesses.',
      effect: { take: { shinies: 0.3 }, lean: { cruelty: 1 } },
      silly: { text: 'A magpie unionizes with three goblins and stages a heist on your hoard. The magpie is now, somehow, middle management. (−shinies)' },
    },
    {
      id: 'predator', weight: 3, bad: true,
      when: (s) => s.chapter >= 2 && s.population >= 4,
      title: 'Something Big in the Dark',
      text: 'An owlbear has caught the warren\'s scent and circles closer each night. It is bigger than your biggest goblin, and hungrier.',
      options: [
        { label: 'Hunt it down', loot: { mushrooms: [20, 35], scrap: [6, 12] }, risk: 0.4, lean: { cruelty: 2 },
          log: 'You took the owlbear in a roaring, ridiculous melee. A goblin or two paid for it — but the warren eats like kings for a week, and the pelt is magnificent.' },
        { label: 'Scare it off with fire and noise', cost: { mushrooms: 8 },
          log: 'You drove the beast off with torches and a truly horrible amount of shrieking. It slinks away hungry. So, a little, do you.' },
        { label: 'Abandon the outer burrows', lean: { wanderlust: 2 },
          log: 'You pulled everyone deep and let the owlbear have the outskirts. Ground given is ground you can take back later. Probably.' },
      ],
      silly: {
        title: 'A Large Adult Owlbear',
        text: 'An owlbear with the energy of an unpaid invoice circles the warren nightly. It has reviewed your defenses and left two stars: "hungry here, would maul again."',
        options: [
          { label: 'Pick a fight with the owlbear', loot: { mushrooms: [20, 35], scrap: [6, 12] }, risk: 0.4, lean: { cruelty: 2 },
            log: 'You fought an owlbear in melee like an absolute fool, and won like an absolute legend. A goblin or two are now stories. The pelt is, frankly, iconic.' },
          { label: 'Out-shriek it', cost: { mushrooms: 8 },
            log: 'You and the whole warren out-shrieked an apex predator. It left to seek therapy. You are not proud. You are a little proud.' },
          { label: 'Rebrand the outskirts as "its problem"', lean: { wanderlust: 2 },
            log: 'You ceded the outer burrows to the owlbear and updated the map accordingly. Real estate is fake anyway.' },
        ],
      },
    },
    {
      id: 'rivalWarband', weight: 3, bad: true,
      when: (s) => s.raidCount >= 1 || s.chapter >= 3,
      title: 'Another Warren\'s Warband',
      text: 'A rival goblin warband — bigger, meaner, and annoyed by your growing reputation — appears at the gate demanding tribute.',
      options: [
        { label: 'Fight them off', loot: { scrap: [8, 16] }, risk: 0.45, lean: { cruelty: 3 }, standing: { snaggletooth: -8 },
          log: 'Goblin against goblin in the mud. You won — barely. The warren held, the survivors swagger, and the Snaggletooth Warren nurses a fresh and lasting grudge.' },
        { label: 'Pay the tribute', cost: { shinies: 14 }, lean: { greed: 1 },
          log: 'You paid them off in shinies and swallowed pride. They\'ll be back next season, of course. They always are.' },
        { label: 'Buy them a drink and a deal', cost: { shinies: 8 }, lean: { openness: 3 }, standing: { snaggletooth: 8 },
          log: 'You got the rival chief gloriously drunk and left as something like allies. The Snaggletooth Warren counts you a friend now — for whatever a goblin\'s friendship is worth.' },
      ],
      silly: {
        title: 'A Rival Warband (With Brand Synergy)',
        text: 'A bigger, meaner warband shows up demanding tribute and, weirdly, a collaboration. Their chief has a business card. It is a flat rock with "CHIEF" scratched on it.',
        options: [
          { label: 'Decline the partnership violently', loot: { scrap: [8, 16] }, risk: 0.45, lean: { cruelty: 3 },
            log: 'Negotiations broke down into the mud. You won, barely. Their business card is yours now. It says CHIEF. You are CHIEF now.' },
          { label: 'Pay the "consulting fee"', cost: { shinies: 14 }, lean: { greed: 1 },
            log: 'You paid the shakedown and got an invoice marked "synergy." They\'ll be back. They always circle back.' },
          { label: 'Merge the two warbands over drinks', cost: { shinies: 8 }, lean: { openness: 3 },
            log: 'You got the rival chief catastrophically drunk and merged the warbands. The new org chart is a disaster. The vibes are immaculate.' },
        ],
      },
    },
    {
      id: 'famine', weight: 3, bad: true,
      when: (s) => s.population >= 6,
      title: 'Lean Times',
      text: 'The stores are thin and too many mouths are open. The tribe looks to you, hungry.',
      options: [
        { label: 'Ration hard', lean: { cruelty: 1 },
          log: 'You cut every belt to the last notch. Tempers fray, but everyone makes it through. Just.' },
        { label: 'Send a desperate foraging party', loot: { mushrooms: [18, 30] }, risk: 0.35,
          log: 'You sent goblins into the dangerous deep for food. They came back with full sacks — most of them did.' },
        { label: 'Buy food from the road', cost: { shinies: 12 }, give: { mushrooms: 30 }, lean: { openness: 2 },
          log: 'You swallowed your pride and your shinies and bought a cartload of turnips from a smug human farmer. The tribe eats. He gloats. Worth it.' },
      ],
      silly: {
        title: 'Snacktageddon',
        text: 'The stores are alarmingly empty and the tribe is doing the thing where they stare at you and slowly tilt their heads. It is, frankly, sinister.',
        options: [
          { label: 'Declare hard rationing', lean: { cruelty: 1 },
            log: 'You introduced portion control to a room full of goblins. You survived. Barely. So did they. Nobody is happy. Everybody is alive.' },
          { label: 'Send a high-risk snack expedition', loot: { mushrooms: [18, 30] }, risk: 0.35,
            log: 'You dispatched goblins into the deep dark for snacks. They returned with glorious hauls — most of them, anyway.' },
          { label: 'DoorGoblin a cart of turnips', cost: { shinies: 12 }, give: { mushrooms: 30 }, lean: { openness: 2 },
            log: 'You paid a smug human farmer for emergency turnips. He left a five-star review of himself. The tribe eats. You seethe.' },
        ],
      },
    },
  ];

  // --- Achievements ("Annals") ----------------------------------
  // Earned passively when test(s) goes true. `secret` ones hide until earned.
  GG.ACHIEVEMENTS = [
    { id: 'firstBuild', name: 'A Hole in the World', desc: 'Raise your first structure.', test: (s, G) => G.distinctBuildings(s) >= 1 },
    { id: 'firstRaid',  name: 'First Blood',         desc: 'Send a warband on its first raid.', test: (s) => s.raidCount >= 1 },
    { id: 'crowd',      name: 'No Longer Alone',      desc: 'Grow the tribe to 8 goblins.', test: (s) => s.population >= 8 },
    { id: 'hoarder',    name: 'Dragon Dreams',        desc: 'Earn 150 shinies, all told.', test: (s) => s.totals.shiniesTotal >= 150 },
    { id: 'architect',  name: 'Warren Architect',     desc: 'Raise 6 different kinds of structure.', test: (s, G) => G.distinctBuildings(s) >= 6 },
    { id: 'merchant',   name: 'Goblin of Commerce',   desc: 'Make 15 trades at the post.', test: (s) => s.tradeCount >= 15 },
    { id: 'raider',     name: 'Scourge of the Roads', desc: 'Complete 8 raids.', test: (s) => s.raidCount >= 8 },
    { id: 'tycoon',     name: 'Insatiable',           desc: 'Reach 18 greed.', test: (s) => s.stats.greed >= 18, secret: true },
    { id: 'tyrant',     name: 'They Whisper Your Name', desc: 'Reach 18 cruelty.', test: (s) => s.stats.cruelty >= 18, secret: true },
    { id: 'saint',      name: 'An Unlikely Welcome',  desc: 'Reach 18 openness.', test: (s) => s.stats.openness >= 18, secret: true },
    { id: 'nomad',      name: 'The Road Calls',       desc: 'Reach 14 wanderlust.', test: (s) => s.stats.wanderlust >= 14, secret: true },
    { id: 'ending',     name: 'A Tale Earned',        desc: 'Bring a goblin\'s tale to its end.', test: (s) => !!s.ending },
  ];

  // --- Milestones (escalation fanfares) -------------------------
  // Celebratory "the numbers went UP" beats. Each fires exactly ONCE, the first
  // time test(s,Game) goes true (tracked in s.milestones), dropping a ⚑ Chronicle
  // line and a transient on-screen banner. Distinct from Annals (which reward
  // specific DEEDS) — milestones reward SCALE, reinforcing the escalation pillar.
  // Thresholds are tuned for the current economy and will be revisited in F2
  // (curated-exponential rework). `silly` is the alternate register.
  // `mult` is the PERSISTENT global production multiplier this milestone grants
  // (Game.globalMult is the product of every fired milestone's mult). This is the
  // curated-exponential escalation engine: a finite ladder of ~×2 jumps that
  // makes production climb by orders of magnitude across a life, then stops
  // (bounded saga — no infinite treadmill). Default 1 = no production effect.
  GG.MILESTONES = [
    { id: 'pop5',  mult: 1.5, test: (s) => s.population >= 5,
      msg: 'The warren swells to five. It is, suddenly, a crowd — and the crowd is yours.',
      silly: 'Population: five. That is a whole HAND of goblins. You count them twice to be sure. Still five. Magnificent.' },
    { id: 'pop10', mult: 1.5, test: (s) => s.population >= 10,
      msg: 'Ten goblins now answer to you. The dark feels a great deal less dark.',
      silly: 'Ten goblins. Double digits, baby. You have, against all odds and several health codes, a workforce.' },
    { id: 'pop20', mult: 2, test: (s) => s.population >= 20,
      msg: 'Twenty strong. The warren has the loud, warm chaos of a real tribe now.',
      silly: 'Twenty goblins. This is no longer "a few lads." This is a SITUATION, and you are legally responsible for it.' },
    { id: 'pop35', mult: 2, test: (s) => s.population >= 35,
      msg: 'Thirty-five goblins. Strangers on the road lower their voices when they pass your wood.',
      silly: 'Thirty-five goblins. You have achieved the population of a small, deeply concerning town. HR is just one tired goblin.' },
    { id: 'hoard100', mult: 1.5, test: (s) => s.totals.shiniesTotal >= 100,
      msg: 'A hundred shinies have passed through your hands. A proper little pouch of wealth.',
      silly: 'One hundred shinies, lifetime. You have a POUCH now. You pat it. It jingles. Do not, under any circumstances, check the exchange rate.' },
    { id: 'hoard500', mult: 2, test: (s) => s.totals.shiniesTotal >= 500,
      msg: 'Five hundred shinies, all told. The hoard throws back a glow when the torches catch it.',
      silly: 'Five hundred shinies. The hoard now makes a satisfying clink-avalanche when you flop into it. Yes, you flop into it. That is what it is FOR.' },
    { id: 'hoard2000', mult: 2, test: (s) => s.totals.shiniesTotal >= 2000,
      msg: 'Two thousand shinies have flowed through the warren. A goblin from a flooded hole, sitting on a real fortune.',
      silly: 'Two thousand shinies. You have begun referring to the hoard as "the portfolio." Nobody is allowed to stop you. Nobody dares.' },
    { id: 'tier2', mult: 1.5, test: (s, G) => G.settlementTier(s) >= 2,
      msg: 'Tents and cook-fires spill past the cave mouth. From the road, your home finally looks like somewhere people live.',
      silly: 'Your hole has TENTS now. This is basically real estate. You are, in a very loose legal sense, a developer.' },
    { id: 'tier4', mult: 2, test: (s, G) => G.settlementTier(s) >= 4,
      msg: 'Palisades, a market road, the clang of trade. They say "the goblins" with a capital G now.',
      silly: 'You have walls and a market and a CAPITAL G. People say "the Goblins" with a small, tired sigh. Iconic. Unforgettable. A brand.' },
    { id: 'tier6', mult: 3, test: (s, G) => G.settlementTier(s) >= 6,
      msg: 'A lamp-lit city, loud and strange and gloriously alive. From a flooded hole to THIS. You did that.',
      silly: 'A whole CITY. Lamps, streets, the works. From one damp puddle to a metropolis — frankly the glow-up is so unreal the bards refuse to believe it.' },
    { id: 'builds5', mult: 2, test: (s, G) => G.distinctBuildings(s) >= 5,
      msg: 'Five kinds of structure stand in the warren. It has the busy, lived-in look of a place with plans.',
      silly: 'Five different buildings. You have a SKYLINE. A small, lumpy, structurally suspect skyline — but a skyline, and it is yours.' },
    { id: 'firstGuest', mult: 1.5, test: (s) => { for (const rc in (s.races || {})) if (s.races[rc] > 0) return true; return false; },
      msg: 'For the first time, a face that isn\'t green calls the warren home. The world is bigger inside your walls than out.',
      silly: 'Someone who is NOT a goblin lives here now. On purpose! The warren is, technically, multicultural. The Totem is thrilled. The goblins are baffled.' },
  ];

  // --- Magnitude tiers (curated-exponential legibility) ---------
  // Maps a raw number to a themed band so big values read as a rank, not a wall
  // of digits ("a Hoard", "a Dragon's Hoard"). Game.magnitude(n) picks the
  // highest band whose `at` <= n. Used for the wealth (shinies) readout.
  GG.MAGNITUDES = [
    { at: 0,       name: 'a Pittance' },
    { at: 50,      name: 'a Handful' },
    { at: 250,     name: 'a Pouch' },
    { at: 1000,    name: 'a Chest' },
    { at: 5000,    name: 'a Hoard' },
    { at: 25000,   name: 'a Dragon’s Hoard' },
    { at: 150000,  name: 'a King’s Ransom' },
    { at: 1000000, name: 'a God’s Ransom' },
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
