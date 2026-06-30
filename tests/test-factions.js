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

// data
ok(Object.keys(GG.FACTIONS).length>=8, 'plenty of factions ('+Object.keys(GG.FACTIONS).length+')');
const startKnown=Object.keys(GG.FACTIONS).filter(id=>GG.FACTIONS[id].startKnown);
ok(startKnown.length>=2 && startKnown.length<Object.keys(GG.FACTIONS).length, 'only some factions known at start ('+startKnown.length+')');

// fresh state
const s=Game.fresh(0.3);
ok(Object.keys(s.standing).length===Object.keys(GG.FACTIONS).length, 'standing initialised for every faction');
ok(Game.knownFactions(s).length===startKnown.length, 'only startKnown discovered initially');
ok(Game.standing(s,'aldermere')===GG.FACTIONS.aldermere.baseStanding, 'standing starts at baseline');
ok(Game.standing(s,'aldermere')<0, 'goblins start despised/distrusted');

// tiers
ok(Game.standingTier(-100)==='Despised', 'tier -100');
ok(Game.standingTier(-56)==='Despised' && Game.standingTier(-55)==='Distrusted', 'tier boundary -55');
ok(Game.standingTier(0)==='Wary' && Game.standingTier(50)==='Respected' && Game.standingTier(100)==='Allied', 'tiers across the range');

// adjust + clamp
Game.adjustStanding(s,'aldermere', 500); ok(Game.standing(s,'aldermere')===100, 'standing clamps high');
Game.adjustStanding(s,'aldermere', -9999); ok(Game.standing(s,'aldermere')===-100, 'standing clamps low');
Game.adjustStanding(s,'nope', 10); ok(true, 'adjusting unknown faction is a no-op (no throw)');

// discovery
const before=Game.knownFactions(s).length, chron=s.chronicle.length;
const undisc=Object.keys(GG.FACTIONS).find(id=>!Game.isDiscovered(s,id));
ok(Game.discoverFaction(s,undisc)===true, 'discoverFaction reveals a new faction');
ok(Game.isDiscovered(s,undisc) && Game.knownFactions(s).length===before+1, 'known set grows by one');
ok(s.chronicle.length>chron, 'discovery is announced in the Chronicle');
ok(Game.discoverFaction(s,undisc)===false, 'discovery is idempotent');

// chapter advance discovers a faction
const s2=Game.fresh(0.3); s2.buildings.mushroomPatch=1; // meets Chapter I req (1 building)
const k0=Game.knownFactions(s2).length;
Game.tick(s2,0.1); // checkChapters -> chapter 1 -> maybeDiscover
ok(s2.chapter>=1 && Game.knownFactions(s2).length===k0+1, 'advancing a chapter opens up a new faction');

// sanitize / import hardening
const evil=Buffer.from(JSON.stringify({resources:{mushrooms:1},
  standing:{aldermere:'<img onerror=x>', beastwilds:9999, fakeFac:50},
  discovered:{fakeFac:true, tannard:true}}),'binary').toString('base64');
const si=Game.importCode(evil);
ok(si.standing.aldermere===GG.FACTIONS.aldermere.baseStanding, 'non-number standing coerced to baseline');
ok(si.standing.beastwilds===100, 'huge standing clamped');
ok(!('fakeFac' in si.standing) && !('fakeFac' in si.discovered), 'unknown faction ids dropped');
ok(si.discovered.tannard===true, 'discovered flags preserved for known ids');
ok(si.discovered.aldermere===true, 'startKnown factions forced discovered');
UI.render(si); ok(true, 'UI renders fine with factions present');

// round-trip
const s3=Game.fresh(0.3); Game.adjustStanding(s3,'karzun',30); Game.discoverFaction(s3,'karzun');
const back=Game.importCode(Game.exportCode(s3));
ok(back.standing.karzun===Game.standing(s3,'karzun') && back.discovered.karzun===true, 'standing+discovery round-trip');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail?1:0);
