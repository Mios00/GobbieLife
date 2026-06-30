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

// --- races: data + totalPop + production + upkeep ---
const s=Game.fresh(0.3);
ok(s.races && s.races.dwarf===0, 'fresh state has races');
ok(Game.totalPop(s)===1, 'totalPop = goblins when no races');
s.races.dwarf=4; s.races.human=2; s.races.elf=1;
ok(Game.totalPop(s)===1+7, 'totalPop counts races');
const r=Game.rates(s);
// dwarves give scrap, humans mushrooms, elves shinies; upkeep on total (8)*0.03
ok(Math.abs(r.scrap - 4*0.25) < 1e-9, 'dwarves produce scrap');
ok(Math.abs(r.shinies - 1*0.06) < 1e-9, 'elves produce shinies');
ok(r.mushrooms === 2*0.28 - 8*GG.CONFIG.upkeepPerGoblin, 'humans feed; upkeep is on the whole settlement');

// --- races join via event/choice option ---
const s2=Game.fresh(0.3);
s2.pendingChoice={title:'t',text:'t',options:[{label:'join',race:{dwarf:1,human:2}}],isEvent:true};
Game.resolveChoice(s2,0);
ok(s2.races.dwarf===1 && s2.races.human===2, 'race option grants races');
// wanderers event exists and grants races
const wand=GG.EVENTS.find(e=>e.id==='wanderers');
ok(wand && wand.options.some(o=>o.race), 'wanderers event grants a race');
// refugees / scholar / minecart now grant races
ok(GG.EVENTS.find(e=>e.id==='refugees').options[0].race, 'refugees take-in grants humans');
ok(GG.RAID_TARGETS.find(t=>t.id==='ruin').options[2].race.elf===1, 'scholar raid grants an elf');
ok(GG.RAID_TARGETS.find(t=>t.id==='minecart').options[2].race.dwarf===1, 'minecart return grants a dwarf');

// --- notables: emergence, aging, activity, death, cap ---
const s3=Game.fresh(0.3); s3.population=20;
let emerged=0, before;
for(let i=0;i<30;i++){ before=s3.notables.length; Game.tick(s3, 22); if(s3.notables.length>before) emerged++; }
ok(s3.notables.length>0, 'notables emerge from a populous tribe ('+s3.notables.length+')');
ok(s3.notables.length<=Game.notableCap(s3), 'roster never exceeds the cap ('+s3.notables.length+'/'+Game.notableCap(s3)+')');
ok(s3.notables.every(nb=>nb.name && nb.role && nb.trait), 'notables have name/role/trait');
// old-age death: force a notable past its lifespan
const s4=Game.fresh(0.3); s4.population=10; Game.tick(s4,22); // get at least one
if(!s4.notables.length){ s4.notables.push({id:1,name:'Old Murt',role:'the Cook',trait:'kind',age:0,life:100}); }
const nb=s4.notables[0]; nb.life=5; nb.age=0;
const popBefore=s4.population, chronBefore=s4.chronicle.length;
nb.age=999; Game.tick(s4,22);
ok(!s4.notables.find(x=>x.id===nb.id), 'a notable past its lifespan dies of old age');
ok(s4.population===popBefore-1, 'old-age death removes a body from the population');
ok(s4.chronicle.length>chronBefore, 'death writes a eulogy to the Chronicle');
// combat death can take a notable (probabilistic) — run many trials
const s5=Game.fresh(0.3); s5.population=30; for(let i=0;i<5;i++) s5.notables.push({id:i+1,name:'N'+i,role:'the Raider',trait:'brave',age:1,life:9999});
let removed=0; for(let i=0;i<200 && s5.population>1 && s5.notables.length>0;i++){ const n0=s5.notables.length; // emulate loseGoblin via a risky choice
  s5.pendingChoice={title:'t',text:'t',options:[{label:'x',risk:1}],isEvent:true}; Game.resolveChoice(s5,0); if(s5.notables.length<n0) removed++; }
ok(removed>0, 'notables can fall in combat ('+removed+' times)');

// --- sanitize/migrate: races + notables coerced; malicious safe ---
const evil=Buffer.from(JSON.stringify({resources:{mushrooms:1},races:{dwarf:'<img>',orc:99,human:3},
  notables:[{id:'<x>',name:'<script>',role:1,trait:'evil',age:'x',life:-5},{bogus:1}], notableSeq:'x'}),'binary').toString('base64');
const si=Game.importCode(evil);
ok(si.races.dwarf===0 && si.races.human===3 && !('orc' in si.races), 'race counts coerced, unknown race dropped');
ok(si.notables.length===2 && typeof si.notables[0].name==='string' && si.notables[0].trait==='greedy', 'notables coerced to safe fields (bad trait -> default)');
ok(Number.isFinite(si.notables[0].age) && si.notables[0].life>=60, 'notable age/life coerced');
UI.render(si);
ok(!/<img|<script/.test(els.goblins.innerHTML+els.notables.innerHTML), 'no raw markup from crafted races/notables');

// --- UI: vista composition + notables panel ---
const sv=Game.fresh(0.3); sv.races.dwarf=3; sv.notables.push({id:1,name:'Skrik',role:'the Raider',trait:'brave',age:50,life:1000});
UI.render(sv);
ok(/dwarves|dwarf/.test(els.goblins.innerHTML), 'vista shows race composition');
ok(/Notable Goblins/.test(els.notables.innerHTML) && /Skrik the Raider/.test(els.notables.innerHTML), 'notables panel lists members');
ok(/Brave/.test(els.notables.innerHTML), 'notable trait shown');

// round-trip
const code=Game.exportCode(sv); const s6=Game.importCode(code);
ok(s6.races.dwarf===3 && s6.notables.length===1 && s6.notables[0].name==='Skrik', 'races+notables round-trip through save');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail?1:0);
