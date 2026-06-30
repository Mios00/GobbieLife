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
const drain=()=>Game.drainBanners(); // keep the queue clean between cases

// fresh state seeds an empty milestone set
const s=Game.fresh(0.3);
ok(s.milestones && typeof s.milestones==='object' && Object.keys(s.milestones).length===0, 'fresh: milestones empty');
drain();

// a scale milestone fires once, records itself, queues exactly one banner
s.population=5; Game.checkMilestones(s);
ok(s.milestones.pop5===true, 'pop5 milestone recorded');
let b=drain();
ok(b.length===1, 'pop5 queued exactly one banner');
ok(/five/i.test(b[0]), 'banner carries the milestone text');
ok(s.chronicle.some(c=>/^⚑/.test(c.msg)), 'a ⚑ Chronicle line was written');

// idempotent — a second check at the same state queues nothing
Game.checkMilestones(s);
ok(drain().length===0, 'milestone does not fire twice');

// milestones that depend on Game (settlementTier / distinctBuildings) work
const s2=Game.fresh(0.3); s2.settle=10; s2.peakPop=30;
s2.buildings.mushroomPatch=1; s2.buildings.scrapHeap=1; s2.buildings.burrow=1; s2.buildings.warTent=1; s2.buildings.lookout=1;
Game.checkMilestones(s2);
ok(s2.milestones.builds5===true, 'builds5 fires off distinctBuildings');
ok(s2.milestones.tier4===true || s2.milestones.tier6===true, 'a settlement-tier milestone fires');
drain();

// firstGuest fires when a non-goblin joins
const s3=Game.fresh(0.3); Game.checkMilestones(s3); drain();
ok(!s3.milestones.firstGuest, 'no guest milestone with an all-goblin warren');
s3.races.dwarf=1; Game.checkMilestones(s3);
ok(s3.milestones.firstGuest===true, 'firstGuest fires when a dwarf joins');
ok(drain().length===1, 'guest milestone queues a banner');

// Game.tick drives milestones in the normal loop
const s4=Game.fresh(0.3); s4.totals.shiniesTotal=120; Game.tick(s4,0.01);
ok(s4.milestones.hoard100===true, 'tick fires hoard100');
drain();

// sanitize: only KNOWN ids survive; injected/unknown keys (incl __proto__) dropped
const evil=Buffer.from(JSON.stringify({resources:{mushrooms:1},milestones:{pop5:true,bogus:true,__proto__:true}}),'binary').toString('base64');
const si=Game.importCode(evil);
ok(si.milestones.pop5===true, 'known milestone id preserved through import');
ok(si.milestones.bogus===undefined, 'unknown milestone id dropped');
ok(!Object.prototype.hasOwnProperty.call(si.milestones,'__proto__'), 'no __proto__ pollution');
drain();

// priming: an already-advanced save marks passed milestones WITHOUT bannering
const adv=Game.fresh(0.3); adv.population=22; adv.totals.shiniesTotal=600;
const loaded=Game.importCode(Game.exportCode(adv));
ok(loaded.milestones.pop5 && loaded.milestones.pop20 && loaded.milestones.hoard500, 'load primes passed milestones');
ok(drain().length===0, 'priming does not spray retroactive banners');
// ...and the next NEW threshold still fires live after load
loaded.population=36; Game.checkMilestones(loaded);
ok(loaded.milestones.pop35===true && drain().length===1, 'a fresh milestone still fires after load');

// UI.fx is a harmless no-op under the headless harness (no createElement)
let threw=false; try { UI.fx.banner('x'); UI.fx.floatText(1,2,'+1'); } catch(_){ threw=true; }
ok(!threw, 'UI.fx degrades gracefully without a real DOM');

// render still works (count-up tween shows the value; no crash)
const su=Game.fresh(0.3); su.resources.shinies=250; UI.render(su);
ok(/Hoard/.test(els.resources.innerHTML) && /250/.test(els.resources.innerHTML), 'resources render with the value');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail?1:0);
