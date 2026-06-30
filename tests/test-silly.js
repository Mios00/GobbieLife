const fs=require('fs'),vm=require('vm'),path=require('path');
const root = require('path').join(__dirname, '..');
const makeEl=()=>({innerHTML:'',style:{},scrollTop:0,scrollHeight:0,dataset:{},textContent:'',addEventListener(){},closest(){return null}});
const els={}; let store={};
const ctx={ console, Math, Date, JSON, parseInt, parseFloat,
  document:{getElementById:id=>els[id]=els[id]||makeEl(), addEventListener(){}},
  localStorage:{getItem:k=>k in store?store[k]:null,setItem:(k,v)=>store[k]=String(v),removeItem:k=>delete store[k]},
  setInterval:()=>0, addEventListener(){}, confirm:()=>true, prompt:()=>null, alert(){},
  btoa:s=>Buffer.from(s,'binary').toString('base64'), atob:s=>Buffer.from(s,'base64').toString('binary'),
  encodeURIComponent,decodeURIComponent,escape,unescape };
ctx.window=ctx; vm.createContext(ctx);
for(const f of ['js/data.js','js/story.js','js/game.js','js/ui.js'])
  vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx,{filename:f});
const GG=ctx.GG, Game=GG.Game, Story=GG.Story, UI=GG.UI;
let pass=0,fail=0; const ok=(c,m)=>{c?pass++:fail++; if(!c)console.log('  FAIL:',m);};

// state carries silliness
ok(Game.fresh(0.0).silliness===0, 'fresh(0) silliness');
ok(Game.fresh(1.0).silliness===1, 'fresh(1) silliness');
ok(Game.fresh().silliness===0.3, 'fresh() default 0.3');
ok(Game.fresh(5).silliness===1, 'silliness clamped to 1');

// silly data present & parallel-keyed
ok(GG.RAID_TARGETS.every(t=>t.silly && t.silly.options.length===t.options.length), 'every raid has parallel silly variant');
const choiceEvents=GG.EVENTS.filter(e=>e.options);
ok(choiceEvents.every(e=>e.silly && e.silly.options), 'every choice event has silly variant');

// legend: at silliness 1, names should come from the silly pool most of the time
let sillyNames=0; for(let i=0;i<200;i++){ const l=Story.makeLegend(1); if(/Greg|Bingus|Beans|Snacc|Gary|Stabby|Klaus|Reginald|Trenchcoat|Steve/.test(l.name)) sillyNames++; }
ok(sillyNames>150, 'silliness=1 yields mostly silly names ('+sillyNames+'/200)');
let earnestNames=0; for(let i=0;i<200;i++){ const l=Story.makeLegend(0); if(/Greg|Bingus|Beans/.test(l.name)) earnestNames++; }
ok(earnestNames===0, 'silliness=0 yields no silly names');

// ambient beats register split — test the real invariant via set membership.
const EARNEST_NEUTRAL = new Set([
  'A goblin invents a worse, louder way to do a simple task. The warren approves.',
  'You count your hoard twice. The number is different each time. You count a third time.',
  'Two goblins fight over a shiny button for an hour, then become best friends.',
  'It rains underground somehow. Nobody questions it.',
  "A goblin returns from the dark with a hat that is clearly someone else's.",
]);
const s1=Game.fresh(1.0); let leakEarnest=0;
for(let i=0;i<400;i++){ if(EARNEST_NEUTRAL.has(Story.ambient(s1))) leakEarnest++; }
ok(leakEarnest===0, 'silliness=1 never draws an earnest beat ('+leakEarnest+' leaks)');
const SILLY_NEUTRAL = new Set([
  'A goblin invented fire. Again. It is the fourth fire today. The other fires are jealous.',
  'Two goblins started a band, broke up over creative differences, reunited, and broke up again, all before lunch.',
  'A goblin filed for a vacation day. You do not offer vacation days. He took it anyway and came back with a tan and no explanation.',
  'Someone keeps reorganizing the hoard alphabetically. The hoard does not have letters. They persist.',
]);
const s0=Game.fresh(0.0); let leakSilly=0;
// (TIMEBEATS are a shared pool drawn at any silliness, so test against the SILLY pool directly)
for(let i=0;i<400;i++){ if(SILLY_NEUTRAL.has(Story.ambient(s0))) leakSilly++; }
ok(leakSilly===0, 'silliness=0 never draws a silly beat ('+leakSilly+' leaks)');

// herald + finale honor silliness
let sh=0; for(let i=0;i<100;i++){ if(/badger|Greg-topia|crow has called|puddle/.test(Story.herald(1,1))) sh++; }
ok(sh>50, 'silly heralds reachable at 1 ('+sh+'/100)');
ok(/hole is yours|not much/i.test(Story.herald(1,0)), 'earnest herald at 0');
let sf=0; for(let i=0;i<100;i++){ const f=Story.finale('villain',1).join(' '); if(/filing systems|vegetables|sequel/.test(f)) sf++; }
ok(sf>50, 'silly finale reachable at 1');

// raid variant selection: silliness=1 should surface silly titles
const sr=Game.fresh(1.0); sr.unlocks.raids=true; sr.jobs.raid=2;
let sillyTitles=0;
for(let i=0;i<100;i++){
  sr.raid={active:true,returnsAt:0,target:GG.RAID_TARGETS[0]};
  Game.tick(sr,0.01); // resolves raid -> pendingChoice
  if(sr.pendingChoice && /Sentient Farm/.test(sr.pendingChoice.title)) sillyTitles++;
  // resolve to clear
  Game.resolveChoice(sr,2);
}
ok(sillyTitles>60, 'raids surface silly variant at silliness=1 ('+sillyTitles+'/100)');

// earnest run never shows silly raid title
const er=Game.fresh(0.0); er.unlocks.raids=true; er.jobs.raid=1; let bad=0;
for(let i=0;i<60;i++){ er.raid={active:true,returnsAt:0,target:GG.RAID_TARGETS[0]}; Game.tick(er,0.01);
  if(/Sentient Farm/.test(er.pendingChoice.title)) bad++; Game.resolveChoice(er,2); }
ok(bad===0, 'earnest run never shows silly raid title');

// resolving a silly event option still applies stats/loot (functional parity)
const ev=GG.EVENTS.find(e=>e.id==='bard');
const se=Game.fresh(1.0); se.resources.mushrooms=50; const op0=se.stats.openness;
se.pendingChoice={title:ev.silly.title,text:ev.silly.text,options:ev.silly.options.map(o=>({...o})),isEvent:true};
Game.resolveChoice(se,0);
ok(se.stats.openness>op0 && se.resources.mushrooms===40, 'silly event option applies cost+lean');

// UI helpers
ok(UI.sillyTier(0)==='Deadly Serious' && UI.sillyTier(1)==='Utterly Unhinged' && UI.sillyTier(0.5)==='Cheeky', 'tier names');
ok(typeof UI.sillyBlurb(0.9)==='string' && /crow lawyer/.test(UI.sillyBlurb(1)), 'blurb at max');

// migrate: legacy save with no silliness -> 0.3
const legacy=Buffer.from(JSON.stringify({resources:{mushrooms:1},buildings:{},population:1}),'binary').toString('base64');
ok(Game.importCode(legacy).silliness===0.3, 'legacy save migrated to 0.3');

// export/import preserves silliness
const code=Game.exportCode(Game.fresh(0.77));
ok(Game.importCode(code).silliness===0.77, 'silliness round-trips through export/import');

// full render at extremes, no throw
let threw=null;
try{ const a=Game.fresh(0); const b=Game.fresh(1); UI.render(a); UI.render(b);
  UI.showStart(()=>{},0.5); UI.hideStart();
}catch(e){threw=e;}
ok(!threw,'UI render + start screen no throw'+(threw?': '+threw.message:''));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail?1:0);
