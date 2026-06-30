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

// fresh state has endgame scaffold
const s=Game.fresh(0.3);
ok(s.endgame && s.endgame.active===false, 'fresh state has inactive endgame');
ok(s.ending===null, 'no ending at start');

// building the Great Hall begins the Reckoning, does NOT instantly end
s.chapter=4; s.peakPop=20; s.resources.scrap=99999; s.resources.shinies=99999; s.resources.mushrooms=99999;
const built=Game.build(s,'greatHall',1);
ok(built===1, 'Great Hall built');
ok(s.endgame.active===true, 'Great Hall begins the Reckoning');
ok(s.ending===null, 'Great Hall does NOT end the game instantly');
ok(/Reckoning begins/i.test(s.chronicle[s.chronicle.length-1].msg), 'opening Reckoning beat chronicled');

// the act advances through beats, then presents the Final Choice (E4)
const cad=GG.CONFIG.reckoningStageSec;
let beats=0, ticks=0;
while(!s.ending && ticks<60){
  // clear any non-Final-Choice modal (raid/event) so the Reckoning can advance
  if (s.pendingChoice && !s.pendingChoice._isFinalChoice) s.pendingChoice=null;
  if (s.pendingChoice && s.pendingChoice._isFinalChoice) break;
  const n0=s.chronicle.length; Game.tick(s, cad); if(s.chronicle.length>n0) beats++; ticks++;
}
ok(s.pendingChoice && s.pendingChoice._isFinalChoice, 'Reckoning presents the Final Choice after all beats');
ok(s.ending===null, 'Final Choice pauses before the ending fires');
ok(beats>=2, 'multiple Reckoning beats played before the Final Choice ('+beats+')');
// Final Choice options: at least 1 available (go as you were is always present)
ok(Array.isArray(s.pendingChoice.options) && s.pendingChoice.options.length>=1, 'Final Choice has at least 1 option');
ok(s.pendingChoice.options.every(o => GG.ENDINGS[o._ending]), 'every Final Choice option maps to a known ending');
// resolve first option → ending fires
Game.resolveChoice(s, 0);
ok(s.ending!==null, 'resolving the Final Choice produces an ending');
ok(s.endgame.active===false, 'endgame deactivates once resolved');
ok(GG.ENDINGS[s.ending.id], 'ending id is a valid destiny');

// building does not double-trigger
const before=s.chronicle.length; Game.beginReckoning(s); ok(s.chronicle.length===before, 'beginReckoning is a no-op once ended');

// header shows the Reckoning marker while active (not ended)
const s2=Game.fresh(0.3); s2.chapter=4; s2.peakPop=20; s2.resources.scrap=99999; s2.resources.shinies=99999; s2.resources.mushrooms=99999;
Game.build(s2,'greatHall',1);
UI.render(s2);
ok(/The Reckoning/.test(els.hdr.innerHTML), 'header shows the Reckoning marker mid-act');

// world is NOT frozen during the act (events/production still tick) but tick still runs
const r=Game.rates(s2); ok(typeof r.mushrooms==='number', 'rates compute during the act');

// once ended, the modal shows the finale and the world freezes
const s3=Game.fresh(0.3); s3.endgame.active=true; Game.finish(s3);
ok(s3.ending && s3.endgame.active===false, 'finish resolves + clears endgame');
const pop0=s3.population; Game.tick(s3, 10); ok(s3.population===pop0, 'world frozen after ending');

// sanitize/round-trip of endgame
const mid=Game.fresh(0.3); mid.endgame={active:true,stage:2,accum:5};
const back=Game.importCode(Game.exportCode(mid));
ok(back.endgame.active===true && back.endgame.stage===2, 'endgame round-trips through save');
const evil=Buffer.from(JSON.stringify({resources:{mushrooms:1},endgame:{active:'<x>',stage:'-9',accum:'z'}}),'binary').toString('base64');
const si=Game.importCode(evil);
ok(si.endgame.active===false && si.endgame.stage===0 && si.endgame.accum===0, 'crafted endgame coerced safely');

// silly register for the Reckoning
let sillyHit=0; for(let i=0;i<60;i++){ if(/push notification|viral|group chat/i.test(GG.Story.reckoningBeat(0,1)||'')) sillyHit++; }
ok(sillyHit>30, 'Reckoning beats honor the Silliness Index');
ok(GG.Story.reckoningBeat(99,0)===null, 'past the last beat returns null (resolve signal)');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail?1:0);
