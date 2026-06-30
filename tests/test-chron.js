const fs=require('fs'),vm=require('vm'),path=require('path');
const root = require('path').join(__dirname, '..');
const writes={};
function makeEl(id){ let _h=''; return { style:{}, scrollTop:0, scrollHeight:0, clientHeight:0, dataset:{}, textContent:'',
  addEventListener(){}, closest(){return null}, get innerHTML(){return _h;}, set innerHTML(v){ _h=v; writes[id]=(writes[id]||0)+1; } }; }
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

const s=Game.fresh(0.3);
// fill to the 200 cap with identical text so length stops changing
for(let i=0;i<205;i++) Game.chronicle(s,'the same ambient line');
ok(s.chronicle.length===200, 'chronicle capped at 200');
ok(s.chronCount>=205, 'chronCount is monotonic past the cap ('+s.chronCount+')');

writes.chronicle=0;
for(let i=0;i<6;i++) UI.render(s);                 // no new entries
ok(writes.chronicle===1, 'no rebuild while unchanged at cap ('+writes.chronicle+')');

// add ANOTHER identical-text line at the cap (length stays 200, text identical)
Game.chronicle(s,'the same ambient line'); UI.render(s);
ok(writes.chronicle===2, 'rebuild fires even when length+text are identical (counter caught it)');

// same-millisecond burst: two entries with identical Date.now()
const realNow=Date.now; let frozen=1700000000000; Date.now=()=>frozen;
const s2=Game.fresh(0.3); Game.chronicle(s2,'A'); writes.chronicle=0; UI.render(s2);
const w=writes.chronicle;
Game.chronicle(s2,'B');  // same frozen ms as previous
UI.render(s2);
ok(writes.chronicle===w+1, 'same-ms entries still trigger a rebuild');
Date.now=realNow;

// export/import preserves chronCount
const code=Game.exportCode(s); const s3=Game.importCode(code);
ok(s3.chronCount===s.chronCount, 'chronCount round-trips through save');
// legacy save without chronCount → defaults to length
const legacy=Buffer.from(JSON.stringify({resources:{mushrooms:1},chronicle:[{t:1,msg:'x'},{t:2,msg:'y'}]}),'binary').toString('base64');
ok(Game.importCode(legacy).chronCount===2, 'legacy save gets chronCount = chronicle length');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail?1:0);
