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

// fresh state seeds the two clocks
const s=Game.fresh(0.3);
ok(s.age===0 && s.lifespan>=GG.CONFIG.lifespanMinSec, 'fresh: age 0, lifespan seeded');
ok(s.comet && s.comet.left>0 && s.comet.total===s.comet.left, 'fresh: comet seeded full');
ok(s.renown===0, 'fresh: renown 0');

// aging advances during play, not offline
const s2=Game.fresh(0.3); Game.tick(s2, 50); ok(s2.age>=50, 'age advances on tick');
const off=Game.fresh(0.3); off.lastSeen=Date.now()-3600*1000; const a0=off.age; Game.applyOffline(off); ok(off.age===a0, 'offline does NOT age you');

// renown grows with grandeur
const s3=Game.fresh(0.3); s3.settle=10; s3.peakPop=30; s3.buildings.mushroomPatch=1; s3.buildings.scrapHeap=1;
Game.tick(s3, GG.CONFIG.renownEverySec); ok(s3.renown>0, 'renown ticks up ('+s3.renown+')');
// raids add renown
const s3b=Game.fresh(0.3); s3b.unlocks.raids=true; s3b.jobs.raid=1; s3b.raid={active:true,returnsAt:0,target:GG.RAID_TARGETS[0]};
const rn0=s3b.renown; Game.tick(s3b,0.01); ok(s3b.renown>rn0, 'a completed raid adds renown');

// twilight portents fire as the end nears
const s4=Game.fresh(0.3); s4.lifespan=100; s4.age=80; const c0=s4.chronicle.length; Game.tick(s4,0.1);
ok(s4.twilight===1 && s4.chronicle.length>c0, 'first twilight portent at ~75% of life');
s4.age=95; Game.tick(s4,0.1); ok(s4.twilight===2, 'second twilight portent at ~90%');

// death of old age triggers the Reckoning (not a silent stop)
const s5=Game.fresh(0.3); s5.lifespan=10; s5.age=9.5; Game.tick(s5,1);
ok(s5.endgame.active===true, 'dying of old age begins the Reckoning');
ok(/does not wake|reaches its end/i.test(s5.chronicle.map(c=>c.msg).join(' ')), 'death is narrated');

// comet portents + arrival triggers the Reckoning
const s6=Game.fresh(0.3); s6.comet={left:5, total:100, warned:0}; Game.tick(s6,0.1);
ok(s6.comet.warned>=3, 'comet portent fires when very close');
Game.tick(s6,10); ok(s6.endgame.active===true, 'the comet arriving begins the Reckoning');

// whichever clock is mid-Reckoning, the other does not re-trigger / no double
const s7=Game.fresh(0.3); s7.lifespan=10; s7.age=20; s7.comet={left:1,total:100,warned:0};
Game.tick(s7,2); ok(s7.endgame.active && !s7.ending, 'one trigger starts the act; world not ended yet');

// UI surfaces renown always, twilight + comet markers when relevant
const su=Game.fresh(0.3); su.renown=42; su.twilight=1; su.comet={left:10,total:100,warned:2}; UI.render(su);
ok(/Renown 42/.test(els.hdr.innerHTML), 'renown shown in header');
ok(/Twilight/.test(els.hdr.innerHTML), 'twilight marker shown when old');
ok(/Comet/.test(els.hdr.innerHTML), 'comet marker shown when near');

// sanitize / round-trip / crafted-safe
const back=Game.importCode(Game.exportCode(su));
ok(back.renown===42 && back.twilight===1 && back.comet.total===100, 'mortality round-trips');
const evil=Buffer.from(JSON.stringify({resources:{mushrooms:1},age:'<x>',lifespan:-5,renown:'z',twilight:99,comet:{left:'a',total:-3,warned:9}}),'binary').toString('base64');
const si=Game.importCode(evil);
ok(si.age===0 && si.lifespan>=60 && si.renown===0 && si.twilight===2, 'crafted mortality coerced/clamped');
ok(si.comet.total>=60 && si.comet.left>=0 && si.comet.warned<=4, 'crafted comet coerced/clamped');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail?1:0);
