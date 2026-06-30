const fs=require('fs'),vm=require('vm'),path=require('path');
const root = require('path').join(__dirname, '..');
const makeEl=()=>({innerHTML:'',style:{},scrollTop:0,scrollHeight:0,dataset:{},textContent:'',addEventListener(){},closest(){return null}});
const els={}; let store={};
const ctx={ console, Math, Date, JSON, parseInt, parseFloat, Number, Array, Object,
  document:{getElementById:id=>els[id]=els[id]||makeEl(), addEventListener(){}},
  localStorage:{getItem:k=>k in store?store[k]:null,setItem:(k,v)=>store[k]=String(v),removeItem:k=>delete store[k]},
  setInterval:()=>0, addEventListener(){}, confirm:()=>true, prompt:()=>null, alert(){},
  btoa:s=>Buffer.from(s,'binary').toString('base64'), atob:s=>Buffer.from(s,'base64').toString('binary'),
  encodeURIComponent,decodeURIComponent,escape,unescape };
ctx.window=ctx; vm.createContext(ctx);
for(const f of ['js/data.js','js/story.js','js/game.js','js/ui.js'])
  vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx,{filename:f});
const GG=ctx.GG, Game=GG.Game, UI=GG.UI;
let pass=0,fail=0; const ok=(c,m)=>{c?pass++:fail++; if(!c)console.log('  FAIL:',m);};

const XSS='<img src=x onerror=alert(1)>';
const enc=o=>Buffer.from(JSON.stringify(o),'binary').toString('base64');

// craft a malicious save code targeting every raw-interpolated numeric sink
const evil = {
  resources:{ mushrooms: XSS, scrap: XSS, shinies: XSS },
  totals:{ shiniesTotal: XSS },
  population: XSS,
  jobs:{ forage: XSS, dig: XSS, raid: XSS },
  buildings:{ mushroomPatch: XSS, burrow: XSS, evilKey: XSS },
  stats:{ greed: XSS, cruelty: XSS, openness: XSS, wanderlust: XSS },
  settle: XSS, raidCount: XSS, tradeCount: XSS, chapter: XSS, silliness: XSS, buyAmt: XSS,
  name: XSS, legendIntro: XSS,
  log:[XSS, {bad:1}, 42],
  chronicle:[{t:XSS,msg:XSS},{nope:1},'string'],
  unlocks:{ raids: XSS, breeding: 1, trade:'yes' },
  achievements:{ firstBuild: XSS, fakeAch: XSS },
  ending:{ id:'__proto__', name:XSS, text:[XSS] },
  pendingChoice:{ title:XSS, text:XSS, options:[{label:XSS, cost:{evilRes:XSS}}] },
  raid:{ active:XSS, returnsAt:XSS, target:{title:XSS} },
};
const s = Game.importCode(enc(evil));
ok(s!==null, 'malicious code still imports (coerced, not rejected)');

// every numeric sink must now be a finite number (no string payload survives)
const isNum = v => typeof v === 'number' && Number.isFinite(v);
ok(['mushrooms','scrap','shinies'].every(k=>isNum(s.resources[k])), 'resources coerced to numbers');
ok(isNum(s.population) && s.population>=1, 'population coerced');
ok(['forage','dig','raid'].every(k=>isNum(s.jobs[k])), 'jobs coerced to numbers');
ok(Object.values(s.buildings).every(isNum), 'building levels coerced to numbers');
ok(!('evilKey' in s.buildings), 'unknown building key dropped');
ok(['greed','cruelty','openness','wanderlust'].every(k=>isNum(s.stats[k])), 'stats coerced');
ok(isNum(s.silliness)&&s.silliness>=0&&s.silliness<=1, 'silliness coerced+clamped');
ok(isNum(s.chapter), 'chapter coerced');
ok(s.buyAmt===1, 'buyAmt coerced (XSS -> default 1)');

// strings are still strings (escaped at render) and transient state cleared
ok(typeof s.name==='string', 'name is string');
ok(s.pendingChoice===null, 'pendingChoice cleared on import');
ok(s.raid.active===false && s.raid.target===null, 'raid cleared on import');
ok(s.ending===null, 'ending with bogus/proto id dropped');
ok(Object.keys(s.achievements).every(id=>GG.ACHIEVEMENTS.some(a=>a.id===id)), 'only known achievement ids kept');
ok(s.unlocks.breeding===false && s.unlocks.raids===false, 'unlock flags coerced to strict booleans');
ok(s.log.every(x=>typeof x==='string'), 'log entries are all strings');
ok(s.chronicle.every(c=>typeof c.msg==='string' && typeof c.t==='number'), 'chronicle entries coerced');

// THE KEY TEST: render the malicious state and assert no live HTML reaches the DOM.
// Any payload that survives would appear UN-escaped (raw "<img" / "onerror=").
UI.render(s);
let raw=0;
const RAWTAG=/<(img|script|svg|iframe|body|style)\b/i;
for(const id in els){
  const h = els[id].innerHTML || '';
  if(RAWTAG.test(h)) { raw++; console.log('   LEAK in #'+id+': '+h.slice(0,140)); }
}
ok(raw===0, 'no raw HTML tag reaches any panel innerHTML after rendering malicious state');

// esc() now also neutralizes quotes (attribute-context hardening)
// (indirect check: render a name with quotes via fresh+manual set, ensure escaped)
const q=Game.fresh(0.3); q.name='">'+XSS; UI.render(q);
ok(!(els['hdr'].innerHTML||'').includes('<img'), 'name with quote/bracket payload escaped in header');

// importCode rejects non-objects / arrays / junk
ok(Game.importCode('not base64 $$$')===null, 'junk code rejected');
ok(Game.importCode(enc([1,2,3]))===null, 'array payload rejected');
ok(Game.importCode(enc('hi'))===null, 'string payload rejected');
ok(Game.importCode(enc({nope:1}))===null, 'object without resources rejected');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail?1:0);
