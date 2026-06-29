/* ============================================================
 * main.js — boot, game loop, autosave
 * ============================================================ */
(function () {
  const GG = window.GG;
  const Game = GG.Game;
  const UI = GG.UI;
  const C = GG.CONFIG;

  let state = Game.load();
  let started = !!state;

  // start (or restart) a brand-new tale at the chosen Silliness Index
  function beginGame(silliness) {
    state = Game.fresh(silliness);
    started = true;
    UI.hideStart();
    UI.render(state);
    Game.save(state);
  }

  if (started) {
    // returning player — credit offline progress and play on
    const offline = Game.applyOffline(state);
    if (offline > 5) {
      const mins = Math.round(offline / 60);
      Game.chronicle(state,
        `While you were away (${mins < 60 ? mins + ' min' : Math.round(mins / 60) + ' hr'}), the warren kept working in the dark.`);
    }
    UI.render(state);
  } else {
    // brand-new player — choose your Silliness Index before anything starts
    UI.showStart(beginGame, 0.3);
  }

  UI.bind(
    () => state,
    (cmd) => {
      if (cmd === 'restart') {
        if (confirm('Abandon this goblin and start a brand-new tale? (Your hoard is lost.)')) {
          const prev = state ? state.silliness : 0.3;
          Game.reset();
          state = null;
          started = false;
          UI.showStart(beginGame, prev); // re-pick the Silliness Index
        }
        return;
      }
      if (!state) return; // start screen is up; ignore stray clicks
      if (cmd === 'export') {
        const code = Game.exportCode(state);
        if (code) window.prompt('Your save code — copy it somewhere safe:', code);
      } else if (cmd === 'import') {
        const code = window.prompt('Paste a save code to load it (replaces your current tale):');
        if (code) {
          const loaded = Game.importCode(code);
          if (loaded) { state = loaded; started = true; UI.hideStart(); alert('Save loaded.'); }
          else alert('That save code could not be read.');
        }
      }
      UI.render(state);
      Game.save(state);
    }
  );

  // simulation tick
  setInterval(() => {
    if (!started || !state) return;
    Game.tick(state, C.tickMs / 1000);
    UI.render(state);
  }, C.tickMs);

  // a faster render so raid countdown / breeding bar feel live
  setInterval(() => { if (started && state) UI.render(state); }, 250);

  // autosave
  setInterval(() => { if (state) Game.save(state); }, 5000);
  window.addEventListener('beforeunload', () => { if (state) Game.save(state); });

  console.log('%cGOBLIN loaded. Go cause shenanigans.', 'color:#7bd36a');
})();
