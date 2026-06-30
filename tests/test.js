const fs = require('fs'), vm = require('vm'), path = require('path');
const root = require('path').join(__dirname, '..');

// --- minimal DOM/window stubs ---
const els = {};
const makeEl = () => ({ innerHTML:'', style:{}, scrollTop:0, scrollHeight:0,
  dataset:{}, addEventListener(){}, closest(){return null} });
const document = {
  getElementById: (id) => (els[id] = els[id] || makeEl()),
  addEventListener(){},
};
let store = {};
const localStorage = {
  getItem:(k)=>k in store?store[k]:null,
  setItem:(k,v)=>{store[k]=String(v)},
  removeItem:(k)=>{delete store[k]},
};
const ctx = { window:{}, document, localStorage, console,
  Math, Date, JSON, setInterval:()=>0, btoa:(s)=>Buffer.from(s,'binary').toString('base64'),
  atob:(s)=>Buffer.from(s,'base64').toString('binary'),
  encodeURIComponent, decodeURIComponent, escape, unescape };
ctx.window = ctx; // GG = window.GG
vm.createContext(ctx);

for (const f of ['js/data.js','js/story.js','js/game.js','js/ui.js']) {
  vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'), ctx, {filename:f});
}
const GG = ctx.GG, Game = GG.Game, UI = GG.UI;
let pass=0, fail=0;
const ok=(c,m)=>{ c?pass++:fail++; if(!c) console.log('  FAIL:',m); };

// fresh state
let s = Game.fresh();
ok(s.buyAmt===1, 'buyAmt default');
ok(s.buildings.brewery===0 && s.buildings.lookout===0, 'new buildings present');
ok(GG.EVENTS.length>=10, 'events pool size '+GG.EVENTS.length);
ok(GG.ACHIEVEMENTS.length>=10, 'achievements size '+GG.ACHIEVEMENTS.length);

// give resources, test bulk build of mushroomPatch x10
s.resources.scrap = 100000;
const built = Game.build(s, 'mushroomPatch', 10);
ok(built===10, 'bulk build x10 got '+built);
ok(s.buildings.mushroomPatch===10, 'mushroomPatch level 10');

// maxAffordable + max build
s.resources.mushrooms = 100000;
const maxN = Game.maxAffordable(s, 'scrapHeap');
const b2 = Game.build(s, 'scrapHeap', 'max');
ok(b2===maxN && b2>0, 'max build matches maxAffordable ('+b2+'/'+maxN+')');

// needs gate: lookout needs raids
s.resources.scrap = 100000; s.resources.mushrooms=100000;
ok(Game.build(s,'lookout',1)===0, 'lookout blocked without raids unlock');
s.unlocks.raids = true; s.peakPop = 20; // reveal-gated buildings need a grown tribe
ok(Game.build(s,'lookout',1)===1, 'lookout builds after raids unlock');
ok(Game.riskFactor(s) < 1, 'riskFactor reduced by lookout: '+Game.riskFactor(s).toFixed(2));

// brewery passive shinies in rates + tick
s.unlocks.trade = true; Game.build(s,'brewery',1);
const r = Game.rates(s);
ok(r.shinies>0, 'brewery gives passive shinies rate '+r.shinies.toFixed(3));
const beforeSh = s.resources.shinies, beforeTot = s.totals.shiniesTotal;
Game.tick(s, 10);
ok(s.resources.shinies>beforeSh, 'shinies grew on tick');
ok(s.totals.shiniesTotal>beforeTot, 'shinies total tracked');

// events: force-fire a choice event and resolve it
const bard = GG.EVENTS.find(e=>e.id==='bard');
s.pendingChoice = { title:bard.title, text:bard.text, options:bard.options.map(o=>({...o})), isEvent:true };
s.resources.mushrooms = 50; const m0 = s.resources.mushrooms, op0 = s.stats.openness;
Game.resolveChoice(s, 0); // costs 10 mush, +openness
ok(s.resources.mushrooms===m0-10, 'event cost deducted');
ok(s.stats.openness>op0, 'event lean applied');
ok(s.pendingChoice===null, 'choice cleared');

// auto event effect (give)
const find = GG.EVENTS.find(e=>e.id==='shinyFind');
const sh0=s.resources.shinies; 
// simulate fireAutoEvent via resolveChoice path not available; emulate effect
ok(find.effect.give.shinies===5, 'auto event data intact');

// gamble option
const gam = GG.EVENTS.find(e=>e.id==='gambler').options[0];
ok(gam.gamble && gam.gamble.stake===10, 'gamble option schema');

// pop event (refugees take-in adds none; strayGoblin auto pop)
s.pendingChoice = { options:[{pop:1,label:'x'}], title:'t', text:'t' };
const p0=s.population; Game.resolveChoice(s,0);
ok(s.population===p0+1, 'pop+ via choice');

// achievements: firstBuild + firstRaid
s.raidCount=1; 
// run a tick to trigger achievement checks
Game.tick(s, 0.1);
ok(s.achievements.firstBuild, 'firstBuild achievement');
ok(s.achievements.firstRaid, 'firstRaid achievement');

// export/import round trip
const code = Game.exportCode(s);
ok(typeof code==='string' && code.length>0, 'export produces code');
const s2 = Game.importCode(code);
ok(s2 && s2.population===s.population && s2.buildings.brewery===s.buildings.brewery, 'import round-trips');
ok(Game.importCode('not-valid-$$$')===null, 'bad import rejected');

// migrate old save (missing new fields)
const old = { resources:{mushrooms:5}, buildings:{mushroomPatch:2}, population:3 };
const m = Game.importCode(Buffer.from(JSON.stringify(old),'binary').toString('base64'));
ok(m && m.buyAmt===1 && m.achievements && m.buildings.brewery===0, 'old save migrated');

// UI render full pass (no throw, templates valid)
let threw=null;
try { UI.render(s); UI.render(Game.fresh()); 
  const e=Game.fresh(); e.ending={id:'chaos',name:'X',text:['a','b']}; UI.render(e);
} catch(err){ threw=err; }
ok(!threw, 'UI.render no throw'+(threw?': '+threw.message:''));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail?1:0);
