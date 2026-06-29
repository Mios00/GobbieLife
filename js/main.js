/* ============================================================
 * main.js — boot, game loop, autosave
 * ============================================================ */
(function () {
  const GG = window.GG;
  const Game = GG.Game;
  const UI = GG.UI;
  const C = GG.CONFIG;

  let state = Game.load() || Game.fresh();

  // credit offline progress on return
  const offline = Game.applyOffline(state);
  if (offline > 5) {
    const mins = Math.round(offline / 60);
    Game.chronicle(state,
      `While you were away (${mins < 60 ? mins + ' min' : Math.round(mins / 60) + ' hr'}), the warren kept working in the dark.`);
  }

  UI.bind(
    () => state,
    (cmd) => {
      if (cmd === 'restart') {
        if (confirm('Abandon this goblin and start a brand-new tale? (Your hoard is lost.)')) {
          Game.reset();
          state = Game.fresh();
        }
      } else if (cmd === 'export') {
        const code = Game.exportCode(state);
        if (code) window.prompt('Your save code — copy it somewhere safe:', code);
      } else if (cmd === 'import') {
        const code = window.prompt('Paste a save code to load it (replaces your current tale):');
        if (code) {
          const loaded = Game.importCode(code);
          if (loaded) { state = loaded; Game.save(state); alert('Save loaded.'); }
          else alert('That save code could not be read.');
        }
      }
      UI.render(state);
      Game.save(state);
    }
  );

  // simulation tick
  setInterval(() => {
    Game.tick(state, C.tickMs / 1000);
    UI.render(state);
  }, C.tickMs);

  // a faster render so raid countdown / breeding bar feel live
  setInterval(() => UI.render(state), 250);

  // autosave
  setInterval(() => Game.save(state), 5000);
  window.addEventListener('beforeunload', () => Game.save(state));

  UI.render(state);
  console.log('%cGOBLIN loaded. Go cause shenanigans.', 'color:#7bd36a');
})();
