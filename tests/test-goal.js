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

// fresh: the next goal is Chapter I's requirement (raise a structure)
const s=Game.fresh(0.3);
let g=Game.nextGoal(s);
ok(g && g.need===1 && g.have===0, 'fresh goal: 0/1 toward chapter I');
ok(/structure/.test(g.label), 'label describes the building requirement');
ok(/A Hole in the World/.test(g.title), 'goal names the chapter being worked toward');

// progress is reflected (a structure raised → 1/1, frac 1)
s.buildings.mushroomPatch=1; g=Game.nextGoal(s);
ok(g.have===1 && g.frac===1, 'goal progress tracks distinctBuildings');

// the metric switches correctly per chapter
const pop=Game.fresh(0.3); pop.chapter=1; pop.population=2;
g=Game.nextGoal(pop); ok(g.need===4 && g.have===2 && /goblins/.test(g.label), 'chapter II tracks population 2/4');
const sh=Game.fresh(0.3); sh.chapter=3; sh.totals.shiniesTotal=15;
g=Game.nextGoal(sh); ok(g.need===60 && g.have===15 && /shinies/.test(g.label), 'chapter IV tracks shinies 15/60');
const se=Game.fresh(0.3); se.chapter=4; se.settle=2;
g=Game.nextGoal(se); ok(g.need===6 && g.have===2, 'chapter V tracks settle 2/6');
const gh=Game.fresh(0.3); gh.chapter=5;
g=Game.nextGoal(gh); ok(/Great Hall/.test(g.label) && g.need===1, 'chapter VI is the Great Hall');

// have never exceeds need in the readout
const over=Game.fresh(0.3); over.chapter=1; over.population=99;
ok(Game.nextGoal(over).have===4, 'have is capped at need for display');

// past the final chapter there is no goal (the Reckoning takes over)
const done=Game.fresh(0.3); done.chapter=GG.CHAPTERS.length;
ok(Game.nextGoal(done)===null, 'no goal once all chapters are reached');

// onboarding tip: contextual early, retires by chapter II
const o=Game.fresh(0.3);
ok(/Scrabble/.test(Game.onboardingTip(o)), 'tip 1: gather + build');
o.buildings.scrapHeap=1; ok(/Burrow/.test(Game.onboardingTip(o)), 'tip 2: raise a Burrow');
o.unlocks.breeding=true; o.population=2; ok(/breed/i.test(Game.onboardingTip(o)), 'tip 3: feed + breed');
o.chapter=2; ok(Game.onboardingTip(o)===null, 'onboarding retires at chapter II');
const oe=Game.fresh(0.3); oe.ending={id:'chaos',name:'x',text:[]}; ok(Game.onboardingTip(oe)===null, 'no tips once the tale has ended');

// UI: the goal strip renders in the header and hides during the Reckoning
const u=Game.fresh(0.3); UI.render(u);
ok(/goalbar/.test(els.hdr.innerHTML) && /Next:/.test(els.hdr.innerHTML), 'header shows the goal strip');
const ur=Game.fresh(0.3); ur.endgame={active:true,stage:1,accum:0}; UI.render(ur);
ok(!/goalbar/.test(els.hdr.innerHTML), 'goal strip hidden while the Reckoning runs');
// onboarding tip appears in the actions panel early
const ua=Game.fresh(0.3); UI.render(ua);
ok(/onbtip/.test(els.actions.innerHTML), 'actions panel shows the onboarding tip early');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail?1:0);
