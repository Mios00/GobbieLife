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
const GG=ctx.GG, Game=GG.Game, Story=GG.Story, UI=GG.UI;
let pass=0,fail=0; const ok=(c,m)=>{c?pass++:fail++; if(!c)console.log('  FAIL:',m);};

// --- config / cadence ---
ok(GG.CONFIG.ambientStoryEverySec===45 && GG.CONFIG.oracleEverySec===100, 'cadence config set');

// --- Oracle riddles ---
const s=Game.fresh(0.3); s.stats.greed=20; // dominant greed
const r=Story.oracle(s);
ok(typeof r==='string' && r.length>30, 'oracle returns a riddle string');
ok(!/\d/.test(r) || !/%/.test(r), 'oracle is not a numeric meter');
// emit via tick once totem/destiny unlocked
const s2=Game.fresh(0.3); s2.unlocks.destiny=true; s2.stats.openness=15;
const before=s2.chronicle.length;
Game.tick(s2, 100);  // >= oracleEverySec
ok(s2.lastOracle && typeof s2.lastOracle==='string', 'tick sets lastOracle once Totem stands');
ok(s2.chronicle.length>before, 'oracle written into the Chronicle');
// no oracle without the Totem
const s3=Game.fresh(0.3); Game.tick(s3,100); ok(s3.lastOracle===null, 'no oracle before Totem');

// --- destiny meter is gone from the UI; oracle shown instead ---
const s4=Game.fresh(0.3); s4.unlocks.destiny=true; s4.lastOracle='The Totem stirs: a riddle.';
UI.render(s4);
ok(/The Oracle/.test(els.destiny.innerHTML) && /a riddle/.test(els.destiny.innerHTML), 'oracle panel shows the riddle');
ok(!/%|Pure Warren|Motley Kingdom|dpct/.test(els.destiny.innerHTML), 'no numeric destiny percentages shown');
const s5=Game.fresh(0.3); UI.render(s5); ok(els.destiny.innerHTML==='', 'oracle hidden before Totem');
// internal destiny still works for the finale
ok(Game.destiny(s).lead, 'Game.destiny still computes a lead internally');

// --- settlement vista ---
ok(Story.settlement(0).name==='A Damp Hole' && Story.settlement(6).name==='A Goblin City', 'settlement tiers named');
ok(Story.settlement(99).name==='A Goblin City', 'settlement tier clamps');
ok(Game.settlementTier(Game.fresh(0.3))===0, 'fresh start = tier 0 (a hole)');
const big=Game.fresh(0.3); big.settle=12; big.peakPop=30; big.buildings.mushroomPatch=1; big.buildings.scrapHeap=1; big.buildings.burrow=1; big.buildings.warTent=1;
ok(Game.settlementTier(big)>=5, 'big rooted warren reaches a high tier ('+Game.settlementTier(big)+')');
ok(Game.settlementTier(big) >= Game.settlementTier(Game.fresh(0.3)), 'tier grows with the warren');
// vista appears in the Tribe panel
const sv=Game.fresh(0.3); UI.render(sv);
ok(/vista/.test(els.goblins.innerHTML) && /Damp Hole/.test(els.goblins.innerHTML), 'vista rendered in Tribe panel');

// --- passage of time ---
let timeHit=0; const st=Game.fresh(0.3);
for(let i=0;i<400;i++){ if(/Seasons turn|generation of goblins|Winter presses|elder goblin|first frost|Spring floods|tally of the dead/.test(Story.ambient(st))) timeHit++; }
ok(timeHit>20, 'passage-of-time beats appear in ambient ('+timeHit+'/400)');

// save round-trips lastOracle
const code=Game.exportCode(s2); ok(Game.importCode(code).lastOracle===s2.lastOracle, 'lastOracle round-trips');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail?1:0);
