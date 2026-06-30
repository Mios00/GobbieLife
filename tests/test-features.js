const fs=require('fs'),vm=require('vm'),path=require('path');
const root = require('path').join(__dirname, '..');
const writes={};
function makeEl(id){ let _h=''; return { style:{}, scrollTop:0, scrollHeight:0, clientHeight:0, dataset:{}, textContent:'',
  addEventListener(){}, closest(){return null}, get innerHTML(){return _h;}, set innerHTML(v){ _h=v; writes[id]=(writes[id]||0)+1; } }; }
const els={};
const ctx={ console, Math, Date, JSON, parseInt, Number, Array, Object,
  document:{getElementById:id=>els[id]=els[id]||makeEl(id), addEventListener(){}},
  localStorage:{getItem:()=>null,setItem(){},removeItem(){}}, setInterval:()=>0, addEventListener(){},
  btoa:s=>Buffer.from(s,'binary').toString('base64'), atob:s=>Buffer.from(s,'base64').toString('binary'),
  encodeURIComponent,decodeURIComponent,escape,unescape };
ctx.window=ctx; vm.createContext(ctx);
for(const f of ['js/data.js','js/story.js','js/game.js','js/ui.js']) vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx,{filename:f});
const GG=ctx.GG, Game=GG.Game, UI=GG.UI;
let pass=0,fail=0; const ok=(c,m)=>{c?pass++:fail++; if(!c)console.log('  FAIL:',m);};

// --- rebalance ---
ok(GG.JOBS.forage.perGoblin===0.2 && GG.JOBS.dig.perGoblin===0.17, 'per-goblin output cut to ~1/3');
ok(Game.breedCost(Game.fresh())===6, 'breed cost cheaper (6 at pop 1), got '+Game.breedCost(Game.fresh()));
ok(GG.BUILDINGS.burrow.base.mushrooms===12 && GG.BUILDINGS.burrow.base.scrap===9, 'burrows cheaper');
// 3x goblins for same output check: 3 foragers now ≈ old 1 forager (0.6)
ok(Math.abs(GG.JOBS.forage.perGoblin*3 - 0.6) < 0.001, '3 foragers ≈ old single forager output');

// --- gradual building reveal ---
const s=Game.fresh(0.3); s.peakPop=1;
ok(Game.buildingRevealed(s,'mushroomPatch') && Game.buildingRevealed(s,'burrow'), 'starter buildings revealed at pop 1');
ok(!Game.buildingRevealed(s,'warTent') && !Game.buildingRevealed(s,'brewery') && !Game.buildingRevealed(s,'totem'), 'advanced buildings hidden at pop 1');
s.peakPop=5;
ok(Game.buildingRevealed(s,'warTent') && Game.buildingRevealed(s,'tradingPost'), 'warTent/tradingPost reveal by pop 5');
ok(!Game.buildingRevealed(s,'brewery'), 'brewery still hidden at pop 5');
s.peakPop=12;
ok(['warTent','tradingPost','lookout','brewery','totem','greatHall'].every(id=>Game.buildingRevealed(s,id)), 'all revealed by pop 12');
// peak is sticky: dropping population keeps reveals
s.population=2;
ok(Game.buildingRevealed(s,'totem'), 'reveals stick even if population drops');

// peakPop tracked in tick
const s2=Game.fresh(0.3); s2.population=7; Game.tick(s2,0.1);
ok(s2.peakPop>=7, 'tick tracks peakPop');

// build is blocked when not revealed
const s3=Game.fresh(0.3); s3.peakPop=1; s3.resources.scrap=99999; s3.resources.mushrooms=99999;
ok(Game.build(s3,'warTent',1)===0, 'cannot build hidden building');
s3.peakPop=10;
ok(Game.build(s3,'warTent',1)===1, 'can build once revealed');

// --- new negative events ---
const ids=GG.EVENTS.map(e=>e.id);
for(const id of ['strayLost','vermin','caveIn','pilfered','predator','rivalWarband','famine'])
  ok(ids.includes(id), 'event present: '+id);
ok(GG.EVENTS.find(e=>e.id==='strayLost').effect.pop===-1, 'strayLost costs a goblin');
ok(GG.EVENTS.filter(e=>e.bad).length>=8, 'plenty of bad events now ('+GG.EVENTS.filter(e=>e.bad).length+')');
ok(GG.CONFIG.eventMinSec===45 && GG.CONFIG.eventMaxSec===95, 'events more frequent');
// choice negative events keep a no-cost escape option (never soft-lock)
for(const id of ['predator','rivalWarband','famine']){
  const e=GG.EVENTS.find(x=>x.id===id);
  ok(e.options.some(o=>!o.cost), id+' has a no-cost option');
}

// --- annals: only earned shown ---
const sa=Game.fresh(0.3); UI.render(sa);
ok(/No deeds yet/.test(els.annals.innerHTML) && !/First Blood/.test(els.annals.innerHTML), 'no achievements shown before earning any');
sa.raidCount=1; Game.tick(sa,0.1); UI.render(sa);
ok(/First Blood/.test(els.annals.innerHTML), 'earned achievement appears');
ok(!/Dragon Dreams|Insatiable|\?\?\?/.test(els.annals.innerHTML), 'locked/secret achievements stay hidden');
ok(/more deed/.test(els.annals.innerHTML), 'remaining count shown');

// --- chronicle dedup (no rebuild when unchanged) ---
const sc=Game.fresh(0.3); Game.chronicle(sc,'first line');
writes.chronicle=0;
for(let i=0;i<8;i++) UI.render(sc);
ok(writes.chronicle===1, 'chronicle rebuilt once across 8 identical frames (got '+writes.chronicle+')');
Game.chronicle(sc,'a new event happened'); UI.render(sc);
ok(writes.chronicle===2, 'chronicle rebuilds when a new entry arrives');
ok(/a new event happened/.test(els.chronicle.innerHTML), 'new entry rendered');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail?1:0);
