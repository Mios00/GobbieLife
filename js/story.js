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

  S.makeLegend = function () {
    return {
      name: pick(GRAMMAR.name),
      intro:
        `You are ${'#NAME#'}, a ${pick(GRAMMAR.adj)} goblin who ${pick(GRAMMAR.origin)}. ` +
        pick(GRAMMAR.omen),
    };
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

  // pick the dominant destiny axis from current stats
  function dominant(stats) {
    let best = 'neutral', bestV = 1.0; // need to beat a small threshold
    for (const k of ['greed', 'cruelty', 'openness', 'wanderlust']) {
      if (stats[k] > bestV) { bestV = stats[k]; best = k; }
    }
    return best;
  }

  // produce one ambient chronicle line, drifting toward the dominant stat
  S.ambient = function (state) {
    const dom = dominant(state.stats);
    // 65% chance to draw from the dominant pool, else neutral colour
    if (dom !== 'neutral' && chance(0.65)) return pick(BEATS[dom]);
    return pick(BEATS.neutral);
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
  S.herald = function (chapterNum) {
    return HERALDS[chapterNum] || `Chapter ${chapterNum}.`;
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
  S.finale = function (endingId) {
    return FINALES[endingId] || ['Your tale ends, somehow.'];
  };
})();
