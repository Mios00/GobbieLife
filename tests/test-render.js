// A1 — render & loop hardening: tap-snap + per-panel HTML memoization.
const fs = require('fs'), vm = require('vm'), path = require('path');
const root = require('path').join(__dirname, '..');
// element stub that COUNTS innerHTML writes, so we can prove a panel is only
// rewritten when its output actually changes (the dirty-flag).
function makeEl(id) {
  let _h = '';
  return {
    id, style: {}, scrollTop: 0, scrollHeight: 0, clientHeight: 0, dataset: {}, textContent: '', writes: 0,
    addEventListener() {}, closest() { return null; }, appendChild() {}, removeChild() {},
    get innerHTML() { return _h; },
    set innerHTML(v) { this.writes++; _h = v; },
  };
}
const els = {};
const ctx = {
  console, Math, Date, JSON, parseInt, Number, Array, Object, String,
  document: { getElementById: (id) => els[id] = els[id] || makeEl(id), createElement: () => makeEl('x'), addEventListener() {} },
  localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
  setInterval: () => 0, setTimeout: () => 0, addEventListener() {},
  btoa: (s) => Buffer.from(s, 'binary').toString('base64'), atob: (s) => Buffer.from(s, 'base64').toString('binary'),
  encodeURIComponent, decodeURIComponent, escape, unescape,
};
ctx.window = ctx; vm.createContext(ctx);
for (const f of ['js/data.js', 'js/story.js', 'js/game.js', 'js/ui.js'])
  vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f });
const GG = ctx.GG, Game = GG.Game, UI = GG.UI;
let pass = 0, fail = 0; const ok = (c, m) => { c ? pass++ : fail++; if (!c) console.log('  FAIL:', m); };
const fmt = (n) => { n = Math.floor(n); if (n < 1000) return '' + n; if (n < 1e6) return (n / 1000).toFixed(n < 1e4 ? 2 : 1) + 'k'; return (n / 1e6).toFixed(2) + 'M'; };

// --- tap-snap: a manual gain shows in the headline number immediately ---
const s = Game.fresh(0.3);
UI.render(s);                                  // seed the count-up display
const before = els.resources.innerHTML;
const amt = Game.manual(s, 'forage');          // +amt mushrooms (1 on a fresh tale)
UI.snapResources(s); UI.render(s);
ok(amt >= 1, 'manual forage yields at least 1');
ok(/rval">1</.test(els.resources.innerHTML), 'headline shows the new mushroom total right after the tap');
ok(els.resources.innerHTML !== before, 'the resources panel changed on the tap');

// --- the +1-at-100 case the old easing swallowed: snap makes it visible ---
const s2 = Game.fresh(0.3);
s2.resources.mushrooms = 100;
UI.render(s2);                                 // disp snaps to 100 (big delta)
Game.manual(s2, 'forage');                     // 100 -> 101
const expect = s2.resources.mushrooms;
UI.snapResources(s2); UI.render(s2);
ok(expect === 101, '+1 tap takes 100 to 101');
ok(els.resources.innerHTML.indexOf('rval">' + fmt(expect) + '<') !== -1, 'a +1 tap at 100 is visible (no ease swallow)');

// --- HTML memoization: an unchanged re-render rewrites nothing ---
const s3 = Game.fresh(0.3);
UI.render(s3);
const watch = ['hdr', 'goblins', 'build', 'actions', 'annals'];
const w0 = {}; for (const k of watch) w0[k] = els[k].writes;
UI.render(s3); UI.render(s3);                  // nothing changed between frames
let stable = true; for (const k of watch) if (els[k].writes !== w0[k]) stable = false;
ok(stable, 'unchanged panels are not rewritten on repeated renders (dirty-flag works)');

// --- a real change DOES rewrite exactly the affected panel ---
const bw = els.build.writes;
s3.resources.scrap = 9999;                     // buildings become affordable → build output changes
UI.render(s3);
ok(els.build.writes > bw, 'an affordability change rewrites the build panel');

// --- the memo resets on a new state object (a fresh/imported tale repaints) ---
const s4 = Game.fresh(0.3);
const gw = els.goblins.writes;
UI.render(s4);
ok(els.goblins.writes > gw, 'a new tale forces a full repaint');

// --- snapResources is a safe no-op before the first render (disp unseeded) ---
const s5 = Game.fresh(0.3);
let threw = false; try { UI.snapResources(s5); } catch (e) { threw = true; }
ok(!threw, 'snapResources before any render is a harmless no-op');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
