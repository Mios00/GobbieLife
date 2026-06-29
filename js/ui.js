/* ============================================================
 * ui.js — rendering & input (DOM only, reads from GG.Game)
 *
 * Render strategy: rebuild panel innerHTML each UI frame and use
 * ONE delegated click handler (data-* attributes) so we never
 * juggle event listeners. Cheap and bulletproof for a text game.
 * ============================================================ */
(function () {
  const GG = (window.GG = window.GG || {});
  const Game = GG.Game;
  const UI = (GG.UI = {});

  const $ = (id) => document.getElementById(id);
  const fmt = (n) => {
    n = Math.floor(n);
    if (n < 1000) return '' + n;
    if (n < 1e6) return (n / 1000).toFixed(n < 1e4 ? 2 : 1) + 'k';
    return (n / 1e6).toFixed(2) + 'M';
  };
  const sign = (n) => (n >= 0 ? '+' : '') + n.toFixed(1);
  // escape for HTML text AND quoted-attribute contexts (covers & < > " ')
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // ---------------------------------------------------------------
  UI.render = function (s) {
    renderHeader(s);
    renderResources(s);
    renderGoblins(s);
    renderActions(s);
    renderBuild(s);
    renderDestiny(s);
    renderAnnals(s);
    renderChronicle(s);
    renderModal(s);
  };

  function renderHeader(s) {
    const chap = s.chapter > 0 && GG.CHAPTERS[s.chapter - 1]
      ? GG.CHAPTERS[s.chapter - 1].title : 'Prologue';
    const pct = Math.round((s.silliness || 0) * 100);
    $('hdr').innerHTML =
      `<div class="title">GOBLIN <span class="sub">— a tale of growth &amp; shenanigans</span></div>
       <div class="meta"><b>${esc(s.name)}</b> &nbsp;·&nbsp; ${esc(chap)}
         &nbsp;·&nbsp; <span class="silly" title="The Silliness Index you set at the start">Silliness ${pct}% · ${esc(UI.sillyTier(s.silliness))}</span></div>`;
  }

  // shared tier naming + flavor for the Silliness Index (0..1)
  UI.sillyTier = function (v) {
    const p = (v || 0) * 100;
    if (p < 15) return 'Deadly Serious';
    if (p < 35) return 'Wry';
    if (p < 60) return 'Cheeky';
    if (p < 85) return 'Silly';
    return 'Utterly Unhinged';
  };
  UI.sillyBlurb = function (v) {
    const p = (v || 0) * 100;
    if (p < 15) return 'A grim little fable. Every joke has a knife in it.';
    if (p < 35) return 'Mostly earnest, with a goblin\'s dark sense of humour.';
    if (p < 60) return 'Equal parts heart and havoc. The classic goblin blend.';
    if (p < 85) return 'The shenanigans are winning, and they know it.';
    return 'There is a crow lawyer. Do not ask. (You will ask.)';
  };

  function renderResources(s) {
    const r = Game.rates(s);
    const rows = ['mushrooms', 'scrap', 'shinies'].map((res) => {
      const def = GG.RESOURCES[res];
      const rate = r[res] || 0;
      // shinies are mostly lump-sum (raids/trade); only show a rate once
      // something produces them passively (the Brewery).
      const showRate = res !== 'shinies' || Math.abs(rate) > 0.0001;
      return `<div class="rrow" title="${esc(def.desc)}">
        <span class="rsym">${def.sym}</span>
        <span class="rname">${def.name}</span>
        <span class="rval">${fmt(s.resources[res])}</span>
        <span class="rrate ${rate < 0 ? 'neg' : ''}">${showRate ? sign(rate) + '/s' : ''}</span>
      </div>`;
    }).join('');
    $('resources').innerHTML = `<h2>Hoard</h2>${rows}`;
  }

  function renderGoblins(s) {
    const cap = Game.goblinCap(s);
    const idle = Game.idleGoblins(s);
    let breed = '';
    if (s.unlocks.breeding) {
      if (s.population >= cap) breed = `<div class="hint">Warren full. Dig more burrows to grow.</div>`;
      else if (s.resources.mushrooms < Game.breedCost(s))
        breed = `<div class="hint">Breeding paused — need ${Game.breedCost(s)} ${GG.RESOURCES.mushrooms.sym} stockpiled.</div>`;
      else {
        const pct = Math.floor((s.breedProgress / GG.CONFIG.breedSecPerGoblin) * 100);
        breed = `<div class="bar"><span style="width:${pct}%"></span></div>
                 <div class="hint">Breeding next goblin… (costs ${Game.breedCost(s)} ${GG.RESOURCES.mushrooms.sym})</div>`;
      }
    } else {
      breed = `<div class="hint">Build a Burrow to grow your tribe.</div>`;
    }

    const jobRow = (job) => {
      const def = GG.JOBS[job];
      if (job === 'raid' && !s.unlocks.raids) return '';
      const out = def.out ? `<span class="jout">${def.perGoblin}/ea ${GG.RESOURCES[def.out].sym}</span>` : `<span class="jout">warband</span>`;
      return `<div class="jrow">
        <button class="mini" data-act="assign" data-job="${job}" data-d="-1">−</button>
        <span class="jcount">${s.jobs[job]}</span>
        <button class="mini" data-act="assign" data-job="${job}" data-d="1">+</button>
        <span class="jname">${def.name}</span>${out}
      </div>`;
    };

    $('goblins').innerHTML =
      `<h2>Tribe <span class="cap">${s.population}/${cap}</span></h2>
       <div class="idle">Idle goblins: <b>${idle}</b></div>
       ${jobRow('forage')}${jobRow('dig')}${jobRow('raid')}
       ${breed}`;
  }

  function renderActions(s) {
    let html = '<h2>Do Things</h2>';
    html += `<button class="act" data-act="manual" data-kind="forage">Scrabble for mushrooms</button>`;
    html += `<button class="act" data-act="manual" data-kind="dig">Pry up scrap</button>`;

    if (s.unlocks.raids) {
      if (s.raid.active) {
        const left = Math.max(0, Math.ceil((s.raid.returnsAt - Date.now()) / 1000));
        html += `<button class="act busy" disabled>Warband raiding… (${left}s)</button>`;
      } else if (s.jobs.raid > 0) {
        html += `<button class="act danger" data-act="raid">⚔ Send warband (${s.jobs.raid}) on a raid</button>`;
      } else {
        html += `<button class="act" disabled>Assign Raiders to raid</button>`;
      }
    }

    if (s.unlocks.trade) {
      html += `<div class="trade">
        <div class="thint">Trade Post:</div>
        <button class="mini2" data-act="trade" data-kind="sellScrap">10⚒ → 4◈</button>
        <button class="mini2" data-act="trade" data-kind="sellMush">10✿ → 3◈</button>
        <button class="mini2" data-act="trade" data-kind="buyMush">2◈ → 12✿</button>
      </div>`;
    }
    html += `<div class="log">${s.log.map((l) => `<div>${esc(l)}</div>`).join('')}</div>`;
    $('actions').innerHTML = html;
  }

  function renderBuild(s) {
    const amt = s.buyAmt || 1;
    const pill = (n, label) =>
      `<button class="pill ${amt === n ? 'on' : ''}" data-act="buyamt" data-n="${n}">${label}</button>`;
    let html = `<h2>Build <span class="cap buyamt">${pill(1, '×1')}${pill(10, '×10')}${pill('max', 'Max')}</span></h2>`;

    for (const id in GG.BUILDINGS) {
      const def = GG.BUILDINGS[id];
      // gradual reveal: hide the option entirely until the tribe has grown enough
      if (!Game.buildingRevealed(s, id)) continue;
      const lvl = s.buildings[id];
      const single = Game.buildingCost(s, id); // null when maxed
      const maxed = !single;
      const chapterLock = def.requiresChapter && s.chapter < def.requiresChapter;
      const needLock = def.needs && !s.unlocks[def.needs];
      const locked = chapterLock || needLock;

      // hide Great Hall until it's nearly relevant
      if (id === 'greatHall' && s.chapter < 3) continue;

      // how many we'd buy with the current selector (one-of buildings → 1)
      let want = def.max === 1 ? 1 : (amt === 'max' ? Game.maxAffordable(s, id) : amt);
      // the cost shown: for Max with nothing affordable, show one level so the
      // requirement is visible.
      const showN = (amt === 'max' && want < 1 && def.max !== 1) ? 1 : Math.max(1, want);
      const quote = maxed ? { cost: {}, count: 0 } : Game.buildingCostN(s, id, showN);

      let costStr = maxed ? '<i>complete</i>' :
        Object.entries(quote.cost).map(([res, n]) =>
          `<span class="${s.resources[res] < n ? 'short' : ''}">${fmt(n)}${GG.RESOURCES[res].sym}</span>`).join(' ');

      const can = !locked && !maxed && want >= 1 && Game.canAfford(s, quote.cost);
      const lvlBadge = def.max === 1 ? '' : `<span class="lvl">×${lvl}</span>`;
      const buyBadge = (!maxed && quote.count > 1) ? `<span class="bmult">+${quote.count}</span>` : '';
      let lockMsg = '';
      if (chapterLock) lockMsg = `<div class="hint">Unlocks in Chapter ${def.requiresChapter}.</div>`;
      else if (needLock) lockMsg = `<div class="hint">Needs the ${needName(def.needs)} first.</div>`;

      html += `<div class="bitem ${can ? '' : 'cant'}">
        <button class="build" data-act="build" data-id="${id}" ${can ? '' : 'disabled'}>
          <span class="bname">${def.name} ${lvlBadge} ${buyBadge}</span>
          <span class="bcost">${costStr}</span>
        </button>
        <div class="bblurb">${esc(def.blurb)}</div>${lockMsg}
      </div>`;
    }
    // teaser so the gradual reveal doesn't feel like a dead end
    const moreToCome = Object.keys(GG.BUILDINGS).some((id) => !Game.buildingRevealed(s, id));
    if (moreToCome) html += `<div class="hint moreBuild">The warren whispers of more to build as it grows…</div>`;
    $('build').innerHTML = html;
  }

  // friendly name for an unlock gate (which building grants it)
  function needName(unlock) {
    const map = { raids: 'War Tent', trade: 'Trading Post', breeding: 'Burrow', destiny: 'Totem of Tales' };
    return map[unlock] || 'right building';
  }

  function renderDestiny(s) {
    const el = $('destiny');
    if (!s.unlocks.destiny) { el.innerHTML = ''; el.style.display = 'none'; return; }
    el.style.display = '';
    const d = Game.destiny(s);
    const total = Object.values(d.scores).reduce((a, b) => a + b, 0) || 1;
    const labels = { purist: 'Pure Warren', multirace: 'Motley Kingdom', chaos: 'Endless Road', villain: 'The Loom' };
    let bars = '';
    for (const id in d.scores) {
      const pct = Math.round((d.scores[id] / total) * 100);
      bars += `<div class="drow">
        <span class="dname ${id === d.lead ? 'lead' : ''}">${labels[id]}</span>
        <div class="bar dbar"><span style="width:${pct}%"></span></div>
        <span class="dpct">${pct}%</span>
      </div>`;
    }
    el.innerHTML = `<h2>Destiny <span class="cap">whispered by the Totem</span></h2>${bars}
      <div class="hint">Your deeds tilt the tale. No one chose this but you — and you didn't quite mean to.</div>`;
  }

  function renderAnnals(s) {
    const list = GG.ACHIEVEMENTS || [];
    const earned = list.filter((a) => s.achievements[a.id]);
    const remaining = list.length - earned.length;
    // only EARNED deeds are shown — locked ones stay hidden until you do them
    let rows = earned.map((a) => `<div class="arow got">
        <span class="amark">✦</span>
        <span class="atext"><b>${esc(a.name)}</b><span class="adesc">${esc(a.desc)}</span></span>
      </div>`).join('');
    if (!earned.length) rows = `<div class="hint">No deeds yet. Your legend is unwritten.</div>`;
    const footer = remaining > 0
      ? `<div class="hint">${remaining} more deed${remaining === 1 ? '' : 's'} wait to be earned…</div>`
      : `<div class="hint">Every deed earned. A complete legend.</div>`;
    $('annals').innerHTML =
      `<h2>Annals <span class="cap">${earned.length}/${list.length}</span></h2>${rows}${footer}`;
  }

  // Only rebuild the Chronicle when a new entry actually arrives, and never
  // yank the scroll position — otherwise the ~4×/sec re-render snapped the view
  // back to the bottom and you couldn't read history. We auto-follow only when
  // you're already pinned to the bottom; if you've scrolled up, we leave you there.
  let lastChronSig = '';
  function renderChronicle(s) {
    const el = $('chronicle');
    const last = s.chronicle[s.chronicle.length - 1];
    // key on length + last entry's TEXT (robust at the 200-entry cap and against
    // same-millisecond timestamps; identical text+length ⇒ identical render anyway)
    const sig = s.chronicle.length + '|' + (last ? last.msg : '') + '|' + (s.legendIntro ? 1 : 0);
    if (sig === lastChronSig) return;                      // nothing new → don't touch the DOM/scroll
    const firstPaint = lastChronSig === '';
    const atBottom = firstPaint || (el.scrollHeight - el.scrollTop - el.clientHeight) < 28;
    const prevTop = el.scrollTop;
    lastChronSig = sig;

    let html = '<h2>Chronicle</h2>';
    if (s.legendIntro) html += `<div class="cintro">${esc(s.legendIntro)}</div>`;
    html += s.chronicle.map((c) => {                       // show the full stored history (up to 200)
      const grand = c.msg.startsWith('—') || c.msg.startsWith('═');
      return `<div class="centry ${grand ? 'grand' : ''}">${esc(c.msg)}</div>`;
    }).join('');
    el.innerHTML = html;
    el.scrollTop = atBottom ? el.scrollHeight : prevTop;   // follow if pinned, else keep your place
  }

  // The UI re-renders ~4×/sec. The modal must only rebuild its innerHTML when
  // its CONTENT actually changes — otherwise the .card entrance animation
  // replays every frame (visible as a blinking / bobbing modal). We dedupe on
  // the modal object's identity plus an affordability signature (which can flip
  // while a choice is open as resources tick up).
  let lastModalObj;          // undefined → forces the first render
  let lastModalAfford = '';

  function renderModal(s) {
    const el = $('modal');
    const obj = s.ending || s.pendingChoice || null;
    let afford = '';
    if (!s.ending && s.pendingChoice) {
      afford = s.pendingChoice.options
        .map((o) => (!o.cost || Game.canAfford(s, o.cost)) ? '1' : '0').join('');
    }
    if (obj === lastModalObj && afford === lastModalAfford) return; // unchanged → leave the DOM alone
    lastModalObj = obj;
    lastModalAfford = afford;

    if (s.ending) {
      el.style.display = 'flex';
      el.innerHTML = `<div class="card ending">
        <h1>${esc(s.ending.name)}</h1>
        ${s.ending.text.map((p) => `<p>${esc(p)}</p>`).join('')}
        <div class="endstats">
          greed ${s.stats.greed.toFixed(0)} · cruelty ${s.stats.cruelty.toFixed(0)} ·
          openness ${s.stats.openness.toFixed(0)} · wanderlust ${s.stats.wanderlust.toFixed(0)}
        </div>
        <button class="act" data-act="restart">Begin a new goblin's tale →</button>
      </div>`;
      return;
    }
    if (s.pendingChoice) {
      const pc = s.pendingChoice;
      el.style.display = 'flex';
      const opts = pc.options.map((o, i) => {
        const ok = !o.cost || Game.canAfford(s, o.cost);
        const costStr = o.cost
          ? ` <span class="ocost ${ok ? '' : 'short'}">(${Object.entries(o.cost)
              .filter(([res]) => GG.RESOURCES[res])  // ignore unknown resource keys
              .map(([res, n]) => fmt(n) + GG.RESOURCES[res].sym).join(' ')})</span>`
          : '';
        return `<button class="act" data-act="choice" data-i="${i}" ${ok ? '' : 'disabled'}>${esc(o.label)}${costStr}</button>`;
      }).join('');
      el.innerHTML = `<div class="card">
        <h1>${esc(pc.title)}</h1>
        <p>${esc(pc.text)}</p>
        <div class="choices">${opts}</div>
      </div>`;
      return;
    }
    el.style.display = 'none';
    el.innerHTML = '';
  }

  // ---- pre-game start screen (the Silliness Index dial) --------
  UI.showStart = function (onBegin, initial) {
    const el = $('start');
    if (!el) return;
    let val = initial == null ? 0.3 : initial;
    el.style.display = 'flex';
    el.innerHTML = `<div class="card start">
      <h1>GOBLIN</h1>
      <p class="startsub">A runt goblin. A hole in the world. A tale that earns its own ending.<br>
        Before you begin, set the <b>Silliness Index</b> — how silly and satirical your run will be.</p>
      <div class="sliderwrap">
        <input id="sillyRange" class="sillyrange" type="range" min="0" max="100" step="1" value="${Math.round(val * 100)}" />
        <div class="sillyends"><span>Deadly Serious</span><span>Utterly Unhinged</span></div>
      </div>
      <div class="sillymeta">
        <span class="sillytier" id="sillyTier">${esc(UI.sillyTier(val))}</span>
        <span class="sillypct">Silliness Index <b id="sillyPct">${Math.round(val * 100)}</b>%</span>
      </div>
      <div class="sillyblurb" id="sillyBlurb">${esc(UI.sillyBlurb(val))}</div>
      <button class="act begin" id="sillyBegin">Begin your tale →</button>
      <div class="startnote">You can’t change this mid-run — it shapes the whole story. Start a new tale to try another setting.</div>
    </div>`;

    const range = $('sillyRange');
    const refresh = () => {
      val = (parseInt(range.value, 10) || 0) / 100;
      $('sillyTier').textContent = UI.sillyTier(val);
      $('sillyPct').textContent = Math.round(val * 100);
      $('sillyBlurb').textContent = UI.sillyBlurb(val);
    };
    range.addEventListener('input', refresh);
    $('sillyBegin').addEventListener('click', () => {
      el.style.display = 'none';
      el.innerHTML = '';
      onBegin(val);
    });
  };
  UI.hideStart = function () {
    const el = $('start');
    if (el) { el.style.display = 'none'; el.innerHTML = ''; }
  };

  // ---- single delegated click handler --------------------------
  UI.bind = function (getState, onChange) {
    document.addEventListener('click', (e) => {
      const t = e.target.closest('[data-act]');
      if (!t) return;
      const s = getState();
      const act = t.dataset.act;
      if (act === 'manual') Game.manual(s, t.dataset.kind);
      else if (act === 'assign') Game.assign(s, t.dataset.job, parseInt(t.dataset.d, 10));
      else if (act === 'build') Game.build(s, t.dataset.id, s.buyAmt || 1);
      else if (act === 'buyamt') s.buyAmt = t.dataset.n === 'max' ? 'max' : parseInt(t.dataset.n, 10);
      else if (act === 'raid') Game.launchRaid(s);
      else if (act === 'trade') Game.trade(s, t.dataset.kind);
      else if (act === 'choice') Game.resolveChoice(s, parseInt(t.dataset.i, 10));
      else if (act === 'restart') onChange('restart');
      else if (act === 'export') onChange('export');
      else if (act === 'import') onChange('import');
      else if (act === 'hardreset') onChange('restart');
      else return;
      onChange('update');
    });
  };
})();
