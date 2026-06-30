const fs=require('fs'),vm=require('vm'),path=require('path');
const root = require('path').join(__dirname, '..');
const makeEl=()=>({innerHTML:'',style:{},scrollTop:0,scrollHeight:0,dataset:{},addEventListener(){},closest(){return null}});
const els={}; let store={};
const ctx={ console, Math, Date, JSON,
  document:{getElementById:id=>els[id]=els[id]||makeEl(), addEventListener(){}},
  localStorage:{getItem:k=>k in store?store[k]:null,setItem:(k,v)=>store[k]=String(v),removeItem:k=>delete store[k]},
  setInterval:()=>0, addEventListener(){}, confirm:()=>false, prompt:()=>null, alert(){},
  btoa:s=>Buffer.from(s,'binary').toString('base64'), atob:s=>Buffer.from(s,'base64').toString('binary'),
  encodeURIComponent,decodeURIComponent,escape,unescape };
ctx.window=ctx; vm.createContext(ctx);
try{
  for(const f of ['js/data.js','js/story.js','js/game.js','js/ui.js','js/main.js'])
    vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx,{filename:f});
  console.log('boot OK — all 5 scripts evaluated, GG.Game present:', !!ctx.GG.Game);
}catch(e){ console.log('BOOT ERROR:', e.message); process.exit(1); }
