const fs=require('fs'),vm=require('vm'),path=require('path');
const root = require('path').join(__dirname, '..');
function makeEl(id){ let _h=''; return { style:{}, scrollTop:0, scrollHeight:0, clientHeight:0, dataset:{}, textContent:'',
  addEventListener(){}, closest(){return null}, get innerHTML(){return _h;}, set innerHTML(v){ _h=v; } }; }
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
const near=(a,b)=>Math.abs(a-b)<1e-9;

// globalMult is 1 on a fresh tale (no milestones) — preserves early balance
const s=Game.fresh(0.3);
ok(Game.globalMult(s)===1, 'fresh global multiplier is 1');

// firing milestones multiplies it by their `mult` (product)
s.milestones.pop5=true;            // ×1.5
ok(near(Game.globalMult(s),1.5), 'one milestone → ×1.5');
s.milestones.pop20=true;           // ×2
ok(near(Game.globalMult(s),3), 'two milestones stack (×1.5 ×2 = ×3)');
s.milestones.tier6=true;           // ×3
ok(near(Game.globalMult(s),9), 'three milestones stack (×9)');

// production scales by the multiplier; a fresh state's rate is unscaled
const a=Game.fresh(0.3); a.jobs.forage=5; a.population=5; // raw forage 5*0.2=1.0
const baseM = a.jobs.forage*GG.JOBS.forage.perGoblin - Game.totalPop(a)*GG.CONFIG.upkeepPerGoblin;
ok(near(Game.rates(a).mushrooms, baseM), 'rate unscaled with no milestones');
a.milestones.pop20=true; // ×2 on PRODUCTION only, upkeep unscaled
const scaled = a.jobs.forage*GG.JOBS.forage.perGoblin*2 - Game.totalPop(a)*GG.CONFIG.upkeepPerGoblin;
ok(near(Game.rates(a).mushrooms, scaled), 'production scales by mult, upkeep does not');
// scrap + shinies scale too
const b=Game.fresh(0.3); b.buildings.scrapHeap=2; b.milestones.tier6=true; // ×3
ok(near(Game.rates(b).scrap, GG.BUILDINGS.scrapHeap.prod.scrap*2*3), 'building scrap scales ×3');

// the full multiplier reaches orders of magnitude (bounded, finite ladder)
const full=Game.fresh(0.3); for(const def of GG.MILESTONES) full.milestones[def.id]=true;
const top=Game.globalMult(full);
ok(top>100 && top<300, 'a complete milestone ladder is ~2 orders of magnitude ('+Math.round(top)+'×)');

// magnitude bands name a number by its rank
ok(Game.magnitude(0)==='a Pittance', 'zero is a Pittance');
ok(Game.magnitude(300)==='a Pouch', '300 → a Pouch');
ok(Game.magnitude(8000)==='a Hoard', '8k → a Hoard');
ok(/Dragon/.test(Game.magnitude(40000)), '40k → a Dragon’s Hoard');
ok(/God/.test(Game.magnitude(5e6)), '5M → a God’s Ransom');
ok(Game.magnitude(2)==='a Pittance', 'below first real band still names something');

// taps scale gently (sqrt of mult): 1 when fresh, more when prosperous
const t=Game.fresh(0.3);
ok(Game.manual(t,'forage')===1 && t.resources.mushrooms===1, 'fresh tap gives +1');
for(const def of GG.MILESTONES) t.milestones[def.id]=true; // mult ~729
const amt=Game.manual(t,'dig');
ok(amt===Math.ceil(Math.sqrt(Game.globalMult(t))) && amt>1 && amt<60, 'tap scales by sqrt(mult) ('+amt+')');

// derived-only: no new persistent state, round-trips clean
const r=Game.fresh(0.3); r.milestones.pop5=true; r.milestones.tier6=true;
const back=Game.importCode(Game.exportCode(r));
ok(near(Game.globalMult(back), 4.5), 'multiplier survives round-trip via s.milestones');

// UI: the Hoard caption shows rank + prosperity
const su=Game.fresh(0.3); su.totals.shiniesTotal=8000; su.milestones.pop20=true; UI.render(su);
ok(/Hoard/.test(els.resources.innerHTML), 'hoard panel renders');
ok(/a Hoard/.test(els.resources.innerHTML), 'caption shows the magnitude rank');
ok(/×2/.test(els.resources.innerHTML), 'caption shows the prosperity multiplier');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail?1:0);
