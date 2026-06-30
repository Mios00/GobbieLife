const fs=require('fs'),vm=require('vm'),path=require('path');
const root = require('path').join(__dirname, '..');
// track innerHTML writes per element id
const writes={};
function makeEl(id){ let _h=''; return { style:{}, scrollTop:0, scrollHeight:0, dataset:{}, textContent:'',
  addEventListener(){}, closest(){return null},
  get innerHTML(){return _h;}, set innerHTML(v){ _h=v; writes[id]=(writes[id]||0)+1; } }; }
const els={};
const ctx={ console, Math, Date, JSON, parseInt, Number, Array, Object,
  document:{getElementById:id=>els[id]=els[id]||makeEl(id), addEventListener(){}},
  localStorage:{getItem:()=>null,setItem(){},removeItem(){}},
  setInterval:()=>0, addEventListener(){}, btoa:s=>Buffer.from(s,'binary').toString('base64'),
  atob:s=>Buffer.from(s,'base64').toString('binary'), encodeURIComponent,decodeURIComponent,escape,unescape };
ctx.window=ctx; vm.createContext(ctx);
for(const f of ['js/data.js','js/story.js','js/game.js','js/ui.js']) vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx,{filename:f});
const GG=ctx.GG, Game=GG.Game, UI=GG.UI;
let pass=0,fail=0; const ok=(c,m)=>{c?pass++:fail++; if(!c)console.log('  FAIL:',m);};

const s=Game.fresh(0.3);
// open a choice (frontier village raid, earnest)
s.pendingChoice={title:'A Frontier Village',text:'...',options:GG.RAID_TARGETS[2].options.map(o=>({...o})),_raiders:1};

writes.modal=0;
for(let i=0;i<10;i++) UI.render(s);           // 10 frames, same choice
ok(writes.modal===1, 'modal rebuilt once across 10 identical frames (got '+writes.modal+')');

// resolving then a NEW choice must rebuild
Game.resolveChoice(s,2); UI.render(s);          // closes modal -> rebuild (display none)
const afterClose=writes.modal;
s.pendingChoice={title:'A Merchant Caravan',text:'...',options:GG.RAID_TARGETS[1].options.map(o=>({...o})),_raiders:1};
for(let i=0;i<5;i++) UI.render(s);
ok(writes.modal===afterClose+1, 'new choice triggers exactly one rebuild (got '+(writes.modal-afterClose)+')');

// affordability flip while open re-renders once
const s2=Game.fresh(0.3); s2.unlocks.trade=true;
s2.resources.shinies=0;
s2.pendingChoice={title:'A Grinning Gambler',text:'...',options:[{label:'Bet',cost:{shinies:10},gamble:{res:'shinies',stake:10}}],isEvent:true};
writes.modal=0; UI.render(s2); UI.render(s2);   // can't afford -> 1 write, then deduped
const w1=writes.modal;
s2.resources.shinies=50;                         // now affordable
UI.render(s2); UI.render(s2);                     // flip -> 1 more write, then deduped
ok(writes.modal===w1+1, 'affordability flip re-renders once (got '+(writes.modal-w1)+')');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail?1:0);
