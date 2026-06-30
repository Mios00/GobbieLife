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

  // ---- simulation tick (wall-clock dt) ----
  // Step the sim on REAL elapsed time, not a fixed 1.0s. Every cadence
  // subsystem accumulates dt, so a larger step is correct — which keeps a
  // throttled/backgrounded tab time-accurate instead of running slow. Absurd
  // jumps (machine sleep, a paused debugger) are skipped; genuine long absences
  // are credited on load by Game.applyOffline, not here.
  let lastTick = Date.now();
  setInterval(() => {
    const now = Date.now();
    if (!started || !state) { lastTick = now; return; } // keep the clock fresh while paused
    let dt = (now - lastTick) / 1000;
    lastTick = now;
    if (dt <= 0) return;
    if (dt > 300) dt = C.tickMs / 1000; // pathological gap — let applyOffline own real absences
    Game.tick(state, dt);
    for (const b of Game.drainBanners()) UI.fx.banner(b); // milestone fanfares
  }, C.tickMs);

  // ---- render (decoupled, paint-aligned) ----
  // One requestAnimationFrame loop replaces the old dual setInterval render.
  // Per-panel HTML memoization (ui.js) means a panel's DOM is rewritten only
  // when its output actually changes, so painting every frame is cheap and a
  // render can never destroy a button mid-click that isn't changing. Guarded so
  // the headless test sandbox (no requestAnimationFrame) is a harmless no-op.
  const raf = (typeof requestAnimationFrame === 'function')
    ? requestAnimationFrame
    : (fn) => (typeof setTimeout === 'function' ? setTimeout(() => fn(Date.now()), 16) : 0);
  function frame() {
    if (started && state) UI.render(state);
    raf(frame);
  }
  raf(frame);

  // autosave
  setInterval(() => { if (state) Game.save(state); }, 5000);
  window.addEventListener('beforeunload', () => { if (state) Game.save(state); });

  console.log('%cGOBLIN loaded. Go cause shenanigans.', 'color:#7bd36a');
})();
