/* ============================================================
 * story.js — the procedural narrative engine
 *
 * Two layers:
 *   1) A small generative GRAMMAR that builds your goblin's
 *      opening legend (name, quirks) so every run reads different.
 *   2) A pool of tagged BEATS. Each tick of "story time" we pick a
 *      beat WEIGHTED by your current dominant hidden stat — so the
 *      chronicle quietly drifts toward an ending you never chose.
 *
 * The player sees a story unfold. Even the author (you!) can't
 * predict which combination a given playthrough produces.
 * ============================================================ */
(function () {
  const GG = (window.GG = window.GG || {});
  const S = (GG.Story = {});

  // --- tiny seeded-ish RNG helpers ------------------------------
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const chance = (p) => Math.random() < p;
  // the Silliness Index (0..1) is just the probability that any given
  // narrative draw comes from the SILLY register instead of the earnest one.
  const silly = (s) => Math.random() < (s || 0);

  // --- generative grammar for the opening legend ----------------
  const GRAMMAR = {
    name: ['Gribbl- the Lesser', 'Snækfang', 'Murt the Damp', 'Ugzul Twice-Born',
           'Veen of the Wet Cave', 'Hobnail', 'Skrik', 'Grad the Unlikely',
           'Pim Sootnose', 'Wretcha', 'Bog-Eye', 'Klud the Curious'],
    adj: ['runtish', 'unusually clever', 'frighteningly hungry', 'stubbornly hopeful',
          'small even for a goblin', 'one-eyed', 'green as envy', 'oddly polite'],
    origin: [
      'crawled out of a flooded warren with nothing but spite and a spoon',
      'was hatched from the last egg of a dying clutch and decided that meant something',
      'was kicked out of three other tribes before lunch',
      'woke in the mud with no memory and a powerful sense of ambition',
      'inherited a hole in the ground and a grudge',
      'traded a tooth to a witch for the idea of "more"',
    ],
    omen: [
      'The crows watched, and did not leave.',
      'A coin spun, landed on its edge, and stayed there.',
      'Somewhere a king felt cold and did not know why.',
      'The mushrooms grew toward you, which mushrooms should not do.',
      'An old map in your pocket had your name on it. You cannot read.',
    ],
  };

  // parallel SILLY grammar — same slots, unhinged contents
  const GRAMMAR_SILLY = {
    name: ['Greg', 'Sir Reginald Mudbottom III (self-appointed)', 'Bingus', 'Princess Stabby',
           'Gary, Destroyer of Brunch', 'Lord Snacc', 'The Goblin Formerly Known As Steve',
           'Two Goblins In A Trenchcoat', 'Klaus the Inevitable', 'Beans'],
    adj: ['legally distinct', 'aggressively normal', 'suspiciously confident', 'unlicensed',
          'small but extremely loud about it', 'powered by spite and snacks',
          'recently divorced (from a puddle)', 'far too online for a cave-dweller'],
    origin: [
      'woke up in a puddle with strong opinions about ownership',
      'was voted "most likely to cause an incident" by a tribe that then fled',
      'fell out of the plot of a different, better story',
      'incorporated as a small business before learning to walk',
      'found a spoon and a sense of purpose, in that order',
      'escaped a tutorial and never once looked back',
    ],
    omen: [
      'A crow began narrating, uninvited, and has not stopped since.',
      'A nearby prophecy filed a formal complaint about you specifically.',
      'The mushrooms unionized in your honour. Their demands are pending.',
      'Somewhere a wizard sneezed your name and got it slightly wrong.',
      'A coin landed on its edge, panicked, and rolled away forever.',
    ],
  };

  // pick a grammar slot from the silly OR earnest pool, per the Index
  function gslot(slot, sill) {
    return pick((silly(sill) ? GRAMMAR_SILLY : GRAMMAR)[slot]);
  }

  S.makeLegend = function (sill) {
    return {
      name: gslot('name', sill),
      intro:
        `You are ${'#NAME#'}, a ${gslot('adj', sill)} goblin who ${gslot('origin', sill)}. ` +
        gslot('omen', sill),
    };
  };

  // --- the lore compose engine (C1) -----------------------------
  // A deterministic, seeded generative engine. Story.compose(templateId, ctx)
  // looks up a template in GG.LORE_POOLS.templates and fills any {slot}s from
  // the tagged pools — weighted by era and silliness register. A template with
  // no slots (a Tier-1 authored set-piece) is returned verbatim. Output is plain
  // text; the CALLER is responsible for esc() before any HTML insertion.
  //
  // Seeded so the same (templateId, ctx) always yields the same line — this
  // makes tests deterministic AND lets a notable/event keep a stable identity
  // across renders within a run. Reused by N1 (titles) and the event library.

  // djb2 string hash → 32-bit unsigned, for seeding from a name/id string.
  function hashStr(str) {
    let h = 5381;
    for (let i = 0; i < str.length; i++) h = (((h << 5) + h) + str.charCodeAt(i)) >>> 0;
    return h >>> 0;
  }
  function resolveSeed(seed) {
    if (typeof seed === 'number' && isFinite(seed)) return (seed >>> 0) || 1;
    if (typeof seed === 'string' && seed.length) return hashStr(seed) || 1;
    return 1;
  }
  // a small LCG (Numerical Recipes constants) → deterministic float in [0,1).
  function seededRng(seed) {
    let state = resolveSeed(seed);
    return function () {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
      return state / 4294967296;
    };
  }
  S.seededRng = seededRng;   // exposed for N1's per-notable seeding

  // assemble a stable title for a notable goblin, seeded by their id so the same
  // individual always keeps the same identity; tier controls how much is revealed:
  //   0 = "[name] [role]" (fresh, no history)
  //   1 = "[prefix] [name] [role]" (a descriptor earned)
  //   2 = "[prefix] [name], [epithet]" (a real name among the warren)
  //   3 = "[prefix] [name], [epithet] [of_phrase]" (a legend)
  S.notableTitle = function (nb) {
    const tier = nb.titleTier || 0;
    if (tier === 0) return nb.name + ' ' + nb.role;
    const rng = seededRng(nb.id);
    const pools = GG.NOTABLE || {};
    const pickp = function (arr) { const a = arr || []; return a.length ? a[Math.floor(rng() * a.length)] : ''; };
    const pfx = pickp(pools.prefixes);
    const ep  = pickp(pools.epithets);
    const ofp = pickp(pools.of_phrases);
    const pre = pfx ? pfx + ' ' : '';
    if (tier === 1) return pre + nb.name + ' ' + nb.role;
    if (tier === 2) return pre + nb.name + ', ' + (ep || nb.role);
    return pre + nb.name + ', ' + (ep || nb.role) + (ofp ? ' ' + ofp : '');
  };

  // pick one entry from a named pool, honouring era preference + sill register.
  function pickFromPool(slotName, era, sillRegister, rng) {
    const pools = GG.LORE_POOLS || {};
    const pool = pools[slotName] || [];
    if (!pool.length) return '';
    const textOf = (e) => (typeof e === 'string' ? e : (e && e.text) || '');
    const sillOf = (e) => (typeof e === 'string' ? null : (e && e.sill) || null);
    const eraOf = (e) => (typeof e === 'string' ? null : (e && e.era != null ? e.era : null));
    // register filter: a sill-tagged entry only appears in its own register
    let base = pool.filter((e) => { const t = sillOf(e); return t == null || t === sillRegister; });
    if (!base.length) base = pool;
    // era weighting: exclude other-era entries; weight era-matched ~3× over untagged
    const weighted = [];
    for (const e of base) {
      const eg = eraOf(e);
      if (era != null && eg != null && eg !== era) continue;     // wrong era → drop
      const w = (era != null && eg === era) ? 3 : 1;             // matched era → favour
      for (let i = 0; i < w; i++) weighted.push(e);
    }
    const cands = weighted.length ? weighted : base;
    return textOf(cands[Math.floor(rng() * cands.length)] || cands[0]);
  }

  // ctx: { seed, sill (0..1), era, and any direct slot values e.g. name/faction }
  S.compose = function (templateId, ctx) {
    ctx = ctx || {};
    const templates = (GG.LORE_POOLS && GG.LORE_POOLS.templates) || {};
    const template = templates[templateId];
    if (typeof template !== 'string') return '';
    const rng = seededRng(ctx.seed);
    // decide the register once, deterministically, from the seed + Silliness
    const sillRegister = (rng() < (ctx.sill || 0)) ? 'silly' : 'earnest';
    const era = (ctx.era != null) ? ctx.era : null;
    return template.replace(/\{(\w+)\}/g, function (_m, slot) {
      // a direct ctx value (a scalar like name/faction) wins over a pool draw
      const v = ctx[slot];
      if (v != null && typeof v !== 'object') return String(v);
      return pickFromPool(slot, era, sillRegister, rng);
    });
  };

  // --- ambient & event beats ------------------------------------
  // Each beat: { text, lean } where lean tags which destiny it nudges
  // (used ONLY for weighting selection, not to change stats).
  // The dominant current stat makes its matching beats far likelier.
  const BEATS = {
    neutral: [
      'A goblin invents a worse, louder way to do a simple task. The warren approves.',
      'You count your hoard twice. The number is different each time. You count a third time.',
      'Two goblins fight over a shiny button for an hour, then become best friends.',
      'It rains underground somehow. Nobody questions it.',
      'A goblin returns from the dark with a hat that is clearly someone else\'s.',
    ],
    greed: [
      'You catch yourself dreaming in coins. The dream has a sequel.',
      'Word spreads of a hoard in the green hills. The word is "tempting."',
      'You build a second lock for a chest that does not need one. Then a third.',
      'A goblin suggests sharing the loot. You laugh until it stops being funny to them.',
    ],
    cruelty: [
      'A captured scout begs for mercy. You file the request for later. Much later.',
      'The other races have a new word now, and it is your name, and they say it quietly.',
      'You realize fear is just respect that arrives faster. You like efficiency.',
      'A war-chant catches on among the young goblins. It is not a nice one.',
    ],
    openness: [
      'A lost dwarf shares your fire. By dawn you are partners in a terrible idea.',
      'An elf teaches a goblin to read. The goblin\'s first sentence is a threat, but it is *spelled correctly*.',
      'Your trading post outsells two human towns. Tall folk come for the mushroom ale.',
      'A human child waves at a goblin sentry. The sentry, confused, waves back. Something shifts.',
    ],
    wanderlust: [
      'You stare down the road for a long time. The warren feels smaller behind you.',
      'A goblin returns with a story so good you have to go see if it\'s true.',
      'You leave a door unlocked on purpose, just to have a reason to come back. Or not.',
      'The map in your pocket grows a new edge every time you sleep.',
    ],
  };

  // parallel SILLY beats — same axis keys so the drift logic is identical
  const BEATS_SILLY = {
    neutral: [
      'A goblin invented fire. Again. It is the fourth fire today. The other fires are jealous.',
      'Two goblins started a band, broke up over creative differences, reunited, and broke up again, all before lunch.',
      'A goblin filed for a vacation day. You do not offer vacation days. He took it anyway and came back with a tan and no explanation.',
      'Someone keeps reorganizing the hoard alphabetically. The hoard does not have letters. They persist.',
    ],
    greed: [
      'You opened a second hoard to hold the overflow from the first hoard. You are now considering a hoard for the hoards.',
      'A goblin proposed a budget. You had him gently removed and the budget eaten.',
      'You started charging admission to look at the big shiny. It is, frankly, doing numbers.',
    ],
    cruelty: [
      'The tall folk made a "Most Wanted" poster of you. The likeness is unflattering. You have had it framed.',
      'You instituted a reign of terror. It has a logo now. The logo is also, somehow, terrifying.',
      'A captured knight begged for mercy. You offered him a punch card: ten raids, the eleventh mercy free.',
    ],
    openness: [
      'An elf moved in and started a book club. The book club is now the most feared faction in three counties.',
      'A dwarf taught the goblins accounting. They use it exclusively for revenge math.',
      'You hosted a cultural exchange. A human left with mushroom recipes. You left with his entire personality.',
    ],
    wanderlust: [
      'You packed for a journey, unpacked, then packed again. The bag has trust issues now.',
      'A goblin returned with a map to somewhere amazing. The map is of here. You go anyway.',
      'You stared dramatically at the horizon. The horizon stared back. It blinked first.',
    ],
  };

  // pick the dominant destiny axis from current stats
  function dominant(stats) {
    let best = 'neutral', bestV = 1.0; // need to beat a small threshold
    for (const k of ['greed', 'cruelty', 'openness', 'wanderlust']) {
      if (stats[k] > bestV) { bestV = stats[k]; best = k; }
    }
    return best;
  }

  // passage-of-time beats — give the Chronicle a felt sense of seasons turning
  // and a warren that ages. Drawn occasionally regardless of stat/silliness.
  const TIMEBEATS = [
    'Seasons turn. The mushrooms go to spore and come again. The warren marks another year in notches no one can quite read.',
    'A whole generation of goblins grows up never having seen the flooded hole you started in. To them, this was always home.',
    'Winter presses down. The tribe huddles deep, tells the old stories badly, and waits for the dark to thin.',
    'An elder goblin dies in his sleep, full of years and stolen soup. The warren is quiet for a day, then loud again.',
    'The first frost. The last raiders of the season trudge home, and the gates are barred against the cold.',
    'Rain for a week straight. The young goblins invent six new games and exactly one new blood-feud.',
    'A goblin who left long ago wanders back — grey now, full of road-stories. The little ones follow him everywhere.',
    'Spring floods the low tunnels again. You move the stores higher, swear at the water, and carry on. You always carry on.',
    'Someone scratches a tally of the dead and the born onto the deep wall. The born are winning. Barely. For now.',
  ];

  // produce one ambient chronicle line, drifting toward the dominant stat AND
  // toward the Silliness Index (which register the line is drawn from).
  S.ambient = function (state) {
    if (chance(0.16)) return pick(TIMEBEATS);  // occasional sense of time passing
    const pool = silly(state.silliness) ? BEATS_SILLY : BEATS;
    const dom = dominant(state.stats);
    // 65% chance to draw from the dominant pool, else neutral colour
    if (dom !== 'neutral' && chance(0.65)) return pick(pool[dom]);
    return pick(pool.neutral);
  };

  // chapter heralds — short, grander lines when a chapter turns
  const HERALDS = {
    1: 'Chapter I. The hole is yours. It is not much. It is a start.',
    2: 'Chapter II. There are more of you now. The dark feels less dark.',
    3: 'Chapter III. Beyond the wood, people have started to say "the goblins" with a capital G.',
    4: 'Chapter IV. You have a reputation now. Reputations, you learn, are a kind of currency.',
    5: 'Chapter V. This is bigger than a warren. You can feel it wanting a name.',
    6: 'Chapter VI. Everything you\'ve done is about to decide what you become.',
  };
  const HERALDS_SILLY = {
    1: 'Chapter I. You have a hole. It is YOUR hole. This is, legally, still being contested by a badger.',
    2: 'Chapter II. There are several of you now. This was nobody\'s plan, least of all yours.',
    3: 'Chapter III. People beyond the wood now say "the goblins" with a capital G and a small, tired sigh.',
    4: 'Chapter IV. You have a reputation now. It is, embarrassingly, mostly about the puddle.',
    5: 'Chapter V. This is bigger than a warren. It wants a name. It is leaning, ominously, toward "Greg-topia."',
    6: 'Chapter VI. The narrator crow has called in sick. You\'re on your own for this part. Try to make it weird.',
  };
  S.herald = function (chapterNum, sill) {
    const pool = silly(sill) ? HERALDS_SILLY : HERALDS;
    return pool[chapterNum] || HERALDS[chapterNum] || `Chapter ${chapterNum}.`;
  };

  // --- finale text, chosen by ending id -------------------------
  const FINALES = {
    purist: [
      'And so the Great Hall rose — for goblins, and goblins alone.',
      'You sealed the roads the tall folk used and salted the welcome mat. Within the walls, every face is green, and that is exactly how you wanted it. The Pure Warren is mighty, and safe, and very, very quiet about who it had to keep out to feel that way.',
      'A kingdom built on a single, narrow idea of "us." History, you suspect, will not be kind. History, you decide, can mind its own business.',
    ],
    multirace: [
      'And so the Great Hall rose, and the doors were thrown wide.',
      'Dwarves forge in your deeps. Elves keep your library. Humans run the markets and complain about goblin plumbing. It should not work. It absolutely should not work. It works anyway, loud and strange and gloriously mixed.',
      'You — a runt from a flooded hole — built a kingdom out of everyone the world threw away. They will tell this story for a long time, and they will get the goblin king\'s name right.',
    ],
    chaos: [
      'You never did raise that Great Hall. Walls were always someone else\'s idea.',
      'They still talk about the goblin warband that appears like weather and leaves like a rumour — here a burned toll-bridge, there a freed prison, somewhere else a noble\'s prized boots simply *gone*. No throne. No banner. Just the road, and the next ridiculous thing over it.',
      'Legends need an ending. You decided yours wouldn\'t have one. The road goes on, and you go with it, laughing.',
    ],
    villain: [
      'You did not build a kingdom. You became a weather system.',
      'Kings pay you not to come. Mothers use your name to frighten the brave. What began as a hungry runt in the mud is now the cold shape on the horizon, and the world has reorganized itself around the question of where you will strike next.',
      'You wanted "more." You got it, and then you got more than that. The goblin that loomed has no equal, and — this is the lonely part — no one left who isn\'t afraid.',
    ],
  };
  // parallel SILLY finales — the satire is the whole joke, not a warning
  const FINALES_SILLY = {
    purist: [
      'And so the Great Hall rose — goblins only, guest list strictly enforced.',
      'You built a kingdom with an extremely specific door policy. Dave is still not invited. Dave, at this point, owns three kingdoms of his own. This is NOT about Dave. (It is, admittedly, a little about Dave.)',
      'A nation united by a single idea, that idea being, essentially, "no." Historians are baffled. You are unavailable for comment, by design.',
    ],
    multirace: [
      'And so the Great Hall rose, and the front door immediately fell off because everyone tried to come in at once.',
      'Dwarves, elves, humans, two of the turnips, and a crow\'s lawyer all live here now. The plumbing is a documented war crime. It works anyway. A committee was formed to study why it works. The committee now also lives here.',
      'You — a runt from a puddle — built a kingdom out of everyone the world misplaced. They threw you a parade. The parade got lost. It has since become a second, smaller, very happy kingdom.',
    ],
    chaos: [
      'You never did raise the Great Hall. Hard to pour a foundation while committing this hard to a bit.',
      'They still talk about the warband that arrives like weather and leaves like a punchline — a burned toll-bridge here, a liberated prison there, a duke\'s prized boots simply *gone*. No throne. No banner. Just the road, and the next ridiculous thing on it.',
      'Legends need an ending. Yours filed for an extension. The road goes on, and you are, by a comfortable margin, the longest thing on it.',
    ],
    villain: [
      'You did not build a kingdom. You became a recurring inconvenience of genuine historic scale.',
      'Your weapon is mild chaos deployed at volume. Kings pay you NOT to reorganize their filing systems. Mothers use your name to make children eat their vegetables. You are a menace. You are, against all odds, thriving.',
      'You wanted "more." You got it, and then you got a sequel. The goblin that loomed has no equal and — more importantly — no notes.',
    ],
  };
  S.finale = function (endingId, sill) {
    const pool = silly(sill) ? FINALES_SILLY : FINALES;
    return pool[endingId] || FINALES[endingId] || ['Your tale ends, somehow.'];
  };

  // --- the Oracle ----------------------------------------------
  // The Totem never names your destiny outright — it speaks in riddles, the way
  // the oracles of old did: a true thing wrapped in a knot. Riddles are drawn
  // weighted by your dominant hidden stat, so a careful listener feels the drift
  // without ever being told the number.
  const ORACLES = {
    greed: [
      'The Totem stirs: "A hoard so bright it throws a shadow shaped like a throne — or a tomb. The dragon and the king are buried in the same gold."',
      'It murmurs of a road paved in coins that always bends back to your own door, and of a hand that closes well but has forgotten how to open.',
      'It shows you a scale: on one pan, everything you own; on the other, a single empty chair, and the scale will not stop tilting toward the chair.',
    ],
    cruelty: [
      'The Totem speaks low: "They will carve your face above their gates — not in love, but so the children behave. A name said only in the dark grows teeth."',
      'It shows a crown of cold iron that fits too well, and the long silence after, where the cheering should have been.',
      'It whispers of a wall built so high to keep the wolves out that, one morning, you cannot remember which side of it the wolves were on.',
    ],
    openness: [
      'The Totem hums warm: "Many hands, and not one of them green, raising the same roof. The stranger you feed at your fire becomes the wall at your back."',
      'It shows a gate left open on purpose, and a city that grew because of it, and no one — not even you — quite able to say whose city it is.',
      'It speaks of a table that lengthens every time someone new sits down, and never, somehow, runs short of bread.',
    ],
    wanderlust: [
      'The Totem rattles like wind in a dry tree: "Your map has no edge — only the next ridge, and the next. A door is just a wall that admitted it was wrong."',
      'It shows footprints that lead away and never circle back, and a tale with no last page, and you, laughing, already over the next hill.',
      'It murmurs that a home you can carry is the only one no one can take — and that you have been packing your whole life.',
    ],
    neutral: [
      'The Totem is quiet tonight. "Too soon," it seems to say. "The clay is still wet. Come back when your hands have decided what they are."',
      'It shows four roads spilling from one door, and your own long shadow standing at the crossing — not yet turned, not yet anything.',
      'It offers only this: "Every legend looks like an accident until the last line. Keep going. The knot ties itself."',
    ],
  };
  S.oracle = function (state) {
    const dom = dominant(state.stats);
    return pick(ORACLES[dom] || ORACLES.neutral);
  };

  // --- the settlement, as it grows (cave → city) ----------------
  // A purely-derived "what does the place LOOK like now" readout. Tier is chosen
  // in game.js from settle + buildings + peak population; this is the flavour.
  const SETTLEMENTS = [
    { name: 'A Damp Hole',     art: '·.( o ).·',            desc: 'One goblin, one hole in the world. It is not much. It is, technically, a start.' },
    { name: 'A Warren',        art: '∩  ∩  ∩',              desc: 'A scatter of burrows in the dark — smoke, squabbles, and the warm reek of mushroom stew.' },
    { name: 'A Cave Camp',     art: '▲ ∩ ▲ ∩ ▲',            desc: 'Hide tents and cook-fires spill past the cave mouth. The tribe has tasted daylight, and likes it.' },
    { name: 'A Crooked Village', art: '▲ ⌂ ∩ ⌂ ▲ ∩',        desc: 'Lopsided huts line a muddy market road. Travellers slow down to stare, then stay to haggle.' },
    { name: 'A Goblin Town',   art: '⌂ ⌂ ╫ ⌂ ⌂ ╫ ⌂',        desc: 'Palisades, a real road, the clang of trade. The word "goblin" now comes with a capital G.' },
    { name: 'A Stronghold',    art: '⌂╫⌂ ▮▮ ⌂╫⌂ ▮',         desc: 'Walls of timber and spite, banners snapping. Other folk queue at the gate now — to deal, or to beg.' },
    { name: 'A Goblin City',   art: '▮⌂╫⌂▮ ╪ ▮⌂╫⌂▮',        desc: 'A sprawling, lamp-lit city — loud, strange, and gloriously alive. From a flooded hole to THIS. You did that.' },
  ];
  S.settlement = function (tier) {
    return SETTLEMENTS[Math.max(0, Math.min(SETTLEMENTS.length - 1, tier | 0))];
  };

  // --- world news ------------------------------------------------
  // Overheard from caravans and wanderers — the world is bigger than the warren,
  // and things happen out there whether or not they reach your gate. Mostly
  // flavour for now; some will grow consequences later (disasters → refugees,
  // price spikes, dangerous zones). A few seed the coming Comet.
  const WORLDNEWS = [
    { text: 'A trader passing through speaks of a great quake that swallowed a road three valleys east. "Whole bridge, gone," he says, and spits.',
      silly: 'A trader reports an earthquake ate a toll bridge three valleys east. He seems to feel the bridge had it coming.' },
    { text: 'A wanderer warms herself at your fire and murmurs of a plague-year in the lowlands. The caravans are taking the long way around now.',
      silly: 'A wanderer mentions a plague in the lowlands, then asks to share your soup. You think about this for a long moment.' },
    { text: 'Caravan-talk: a far-off kingdom has crowned a child-queen, and three uncles who all smile too much.',
      silly: 'Road gossip: a distant kingdom crowned a child-queen flanked by three uncles smiling like they\'ve already drafted the eulogy.' },
    { text: 'A drover says the river Mourn ran red for a week and no one would say why. He left before he had to find out.',
      silly: 'A drover swears the river Mourn ran red for a week. He did NOT investigate, and considers this his cleverest life decision.' },
    { text: 'Wanderers speak of a comet hung low in the southern sky, brighter each night. The old ones are nervous. The old ones are usually right.',
      silly: 'Wanderers keep mentioning a comet getting brighter down south. The old ones are nervous. The old ones have a 100% hit rate and it is ANNOYING.' },
    { text: 'A tinker reports a dragon woke somewhere in the peaks, and a duke\'s tax-train simply never arrived. He found this very funny.',
      silly: 'A tinker reports a dragon woke up and a duke\'s entire tax-train vanished. He is delighted. Frankly, so are you.' },
    { text: 'Word on the road: two kingdoms that loathed each other now loathe someone else more, and have, grotesquely, become friends.',
      silly: 'Road news: two kingdoms that hated each other found a third thing to hate together and are now besties. Politics!' },
    { text: 'A pilgrim tells of famine in the wheat-lands; bread costs a week\'s wage. Goblins, who eat mushrooms, feel briefly and smugly superior.',
      silly: 'A pilgrim reports bread now costs a week\'s wage in the wheat-lands. The warren, which eats mushrooms, is INSUFFERABLE about this for days.' },
    { text: 'A caravan-guard says the dead walked at Mournhollow again this autumn — polite as ever — and then went back to work.',
      silly: 'A caravan-guard says the dead got up and walked at Mournhollow again, said sorry, and clocked back in. Great work ethic, terrible vibes.' },
    { text: 'A storm-season worse than any in memory drowned the coast road, they say. The fishers are calling it an omen. The fishers always are.',
      silly: 'Worst storm-season in memory drowned the coast road. The fishers are calling it an omen. The fishers call EVERYTHING an omen.' },
  ];
  S.worldNews = function (state) {
    const n = pick(WORLDNEWS);
    return silly(state.silliness) ? n.silly : n.text;
  };

  // --- the Reckoning (endgame act) ------------------------------
  // SCAFFOLD ONLY. Raising the Great Hall begins a staged climactic act rather
  // than ending instantly; these placeholder beats advance, then the ending
  // resolves. Later tasks (E4 Final Choice, E5 destiny climaxes) replace this
  // with destiny-specific, interactive content. Returns null past the last beat
  // (the signal for game.js to resolve the ending).
  const RECKONING = [
    'The Great Hall rises, beam by impossible beam — and far beyond the wood, the powers of the world turn their heads toward a goblin who was meant to stay a rumour. The Reckoning begins.',
    'Word spreads like fire on dry grass. Banners are counted, old debts remembered. Something is gathering at the edge of the map, and it is gathering toward you.',
    'The horizon darkens with the weight of everyone you have ever touched — every mercy, every cruelty, every road taken or refused. The hour is almost upon you.',
    'The Totem blazes once — no riddles tonight. "You are what you chose to be," it says, "and nothing else. The road took its shape from your footprints. What comes next is the ending of the story you wrote." Then it goes quiet, and stays quiet.',
    'In the stillness before the last tide, you understand: this was always the Bargain. Not a contract signed in darkness — every choice you ever made, accumulating into the shape of an ending. The door is here. You have been walking toward it since the day you crawled out of the flooded hole.',
  ];
  const RECKONING_SILLY = [
    'The Great Hall goes up beam by improbable beam, and the entire world simultaneously gets a push notification about a goblin it was promised would stay irrelevant. The Reckoning begins (sorry).',
    'The news goes viral. Banners are counted. Old grudges reactivate like dormant subscriptions. Something is coming, and it has your address.',
    'The horizon fills up ominously, like a group chat you were added to without consent. Everything you have ever done is about to be tallied by people with very strong opinions.',
    'The Totem blazes once and, for the very first time, drops the metaphors entirely: "You are exactly what you kept doing over and over until it was a personality," it says. "The story has your fingerprints on every page. Here comes the part where it stops." Then the Totem goes dark in a way that feels very final.',
    'In the terrible quiet before the end, it becomes clear: the Bargain was the vibe all along. Not a formal agreement so much as a lifestyle that got away from you. Every mushroom, every raid, every suspicious decision — all of it was just the setup. The door has been here the whole time. You have, essentially, been agreeing to this for ages.',
  ];
  S.reckoningBeat = function (stage, sill) {
    const pool = silly(sill) ? RECKONING_SILLY : RECKONING;
    return (stage >= 0 && stage < pool.length) ? pool[stage] : null;
  };

  // --- the Final Choice (E4) ------------------------------------
  // The modal text + per-option labels for each available door.
  const FINAL_CHOICE_TEXT = {
    earnest: 'The door is open. All your choices led here. Not every road is yours to take — but those that are, only you can walk. What does the runt from the flooded hole choose, at the very last?',
    silly: 'Here you are. At the end of the whole goblin thing. Some roads are locked (you didn\'t earn them; that\'s fine; no judgment (a little judgment)). The ones that are open are genuinely yours. So: what\'s it going to be?',
  };
  const NATURAL_LABELS = {
    purist:    'This warren endures. Ours alone. As it should be.',
    multirace: 'The gates stay open. They always were.',
    chaos:     'The road. Always the road.',
    villain:   'Let the name loom forever.',
  };
  S.finalChoiceText = function (sill) {
    return silly(sill) ? FINAL_CHOICE_TEXT.silly : FINAL_CHOICE_TEXT.earnest;
  };
  S.naturalChoiceLabel = function (endingId) {
    return NATURAL_LABELS[endingId] || 'Accept what comes.';
  };

  // --- the two clocks: your mortality, and the Comet ------------
  const TWILIGHT = {
    earnest: [
      'Your bones ache in the cold now, and the young goblins glance at you with a new, wary tenderness. You are not what you were.',
      'You catch your reflection in a still pool and do not, for a moment, know the old goblin looking back. The years have come for you, as they come for all.',
    ],
    silly: [
      'Your knees now forecast the weather and your back has filed three formal complaints. The young goblins have started calling you "sir" in a tone you do not care for.',
      'You caught your reflection in a puddle and genuinely asked it who it was. The puddle, tactfully, declined to answer. The years are winning.',
    ],
  };
  S.twilightBeat = function (stage, sill) {
    const p = silly(sill) ? TWILIGHT.silly : TWILIGHT.earnest;
    return p[Math.max(0, Math.min(stage - 1, p.length - 1))];
  };

  const COMET = {
    earnest: [
      'A new star hangs low in the south, the wanderers say, and it was not there before. The old ones have stopped joking about it.',
      'The comet is unmistakable now — a cold, bright wound in the sky. Birds fly strangely, caravans hurry, and everyone pretends not to look up.',
      'The comet fills half the night and throws shadows at midnight. Whatever it heralds is nearly here. The warren keeps one eye always upward.',
    ],
    silly: [
      'There is a new star down south that everyone agrees was NOT there last week. The old ones have gone ominously quiet, which is so much worse than their usual.',
      'The comet is now extremely noticeable, like a cosmic unread-notification badge. Birds are acting weird. Caravans are speed-walking. Nobody is making eye contact with the sky.',
      'The comet now takes up half the night and casts shadows at midnight, which is just RUDE of it. Whatever it means is nearly here and it did not RSVP.',
    ],
  };
  S.cometBeat = function (stage, sill) {
    const p = silly(sill) ? COMET.silly : COMET.earnest;
    return p[Math.max(0, Math.min(stage - 1, p.length - 1))];
  };

  // --- Heir succession intros (L1) --------------------------------
  // Rendered as the new life's legendIntro when the protagonist is the named heir.
  const HEIR_INTRO = {
    earnest: [
      'You are #HEIRNAME#, #HEIRROLE# and inheritor of #FOUNDERNAME#\'s legacy. The warren they built still stands. What you do with it — that is the open question.',
      '#HEIRNAME#. You watched #FOUNDERNAME# build this place from dirt and spite. Now the warren is yours. The name is yours. The debts are also, unfortunately, yours.',
      'They called #FOUNDERNAME# #ENDING#. You are #HEIRNAME# — you were beside them at the end. Now the tide is yours to read, and to swim against.',
    ],
    silly: [
      'You are #HEIRNAME#, #HEIRROLE#, which technically makes you the most important goblin here, a fact you are going to have to explain to everyone individually and repeatedly. #FOUNDERNAME# left you a settlement, a ledger full of increasingly creative accounting, and a note that just says "good luck."',
      '#HEIRNAME#. #FOUNDERNAME# was technically #ENDING# and now you are technically in charge, which means this is technically your problem. The goblins are watching you with what you have decided to interpret as confidence.',
      'Congratulations, #HEIRNAME#. You are the new boss. The old boss (#FOUNDERNAME#) is gone in a way that everyone is describing as "epic" but also "kind of a lot." The warren is yours. No take-backs.',
    ],
  };

  S.heirIntro = function (heirNotable, founder, silliness) {
    const pool = silly(silliness) ? HEIR_INTRO.silly : HEIR_INTRO.earnest;
    return pick(pool)
      .replace(/#HEIRNAME#/g, heirNotable.name)
      .replace(/#HEIRROLE#/g, heirNotable.role || 'the successor')
      .replace(/#FOUNDERNAME#/g, founder.name || 'the founder')
      .replace(/#ENDING#/g, founder.endingName || 'gone');
  };
})();
