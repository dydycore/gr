import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {preloadVisualFonts} from './visual-scenes-colour.js';
import {createExportPlan} from './export-sequence.js';

// Exercise the real scene callbacks without a GPU. The MP4/player itself has
// separate decoder/seek tests; here we protect integration and export ordering.
const source=readFileSync(new URL('scene.js',import.meta.url),'utf8').replace(/\r\n/g,'\n');
const functionSource=name=>{
 const found=source.match(new RegExp(`function ${name}\\([^]*?\\n}`));
 assert.ok(found,`${name} exists`);return found[0];
};
const elements=new Map(),element=id=>{
 if(!elements.has(id))elements.set(id,{checked:false,textContent:'',disabled:false,value:'',setAttribute(){}});
 return elements.get(id);
};
let decoded=false,draws=0;
const context={
 state:{videoOn:true,videoMode:'dream',motion:false,roomDark:true,projectionGuides:false,savedAmbience:null,ambience:null},
 exportVideoMode:false,document:{hidden:false,querySelectorAll:()=>[]},elapsed:0,lastVideoKey:'',ambienceFade:null,
 invalidateRender(){},projectionEnabled:()=>context.state.videoOn,backgroundExportBusy:false,
 syncVideoBackgroundPlayback(){},getVideoBackgroundStatus:()=>({mode:'dream',frameReady:decoded}),
 ambienceFadeProgress:()=>1,getVideoBackgroundRevision:()=>0,getVisualFontRevision:()=>0,
 visibleImage:{visible:true,material:{opacity:1}},ctx:{},vjTexture:{},eventLogo:{complete:true},
 drawEventVisual(){draws++;},barGlow:{shadow:{}},sun:{shadow:{}},fixtures:[],hemi:{},renderer:{},
 scene:{background:{set(){}}},decorative:[],rigHighlight:{},reserveRing:{},renderFixtures(){},projectionGuide:{},
 audience:{},shell:{},cutaway:{},route:{},$:element,lightingEditor:null,ambienceDefinitions:[],syncAmbienceName(){},syncVideo(){}
};
vm.createContext(context);vm.runInContext(functionSource('drawVJ')+'\n'+functionSource('applyMode'),context);
context.applyMode();
assert.equal(context.visibleImage.visible,false,'Applying settings cannot expose an old canvas before the first decoded MP4 frame');
assert.equal(draws,0,'No placeholder/photo is rendered before the real frame');
context.applyMode();assert.equal(context.visibleImage.visible,false,'Repeated UI updates preserve first-frame gating');
decoded=true;context.applyMode();assert.equal(context.visibleImage.visible,true);assert.equal(draws,1);
context.applyMode();assert.equal(draws,1,'An unchanged ready frame keeps the canvas cache');
context.state.videoOn=false;context.applyMode();assert.equal(context.visibleImage.visible,false);
context.state.videoOn=true;context.state.videoMode='pinky';context.applyMode();
assert.equal(context.visibleImage.visible,false,'A decoded frame from a different mode never opens the new mode');
let heldFrames=0;context.ctx={save(){},restore(){},drawImage(){heldFrames++;}};
context.ambienceFade={image:{},opacity:.7};context.ambienceFadeProgress=()=>0;context.applyMode();
assert.equal(context.visibleImage.visible,true);assert.equal(context.visibleImage.material.opacity,.7);assert.equal(heldFrames,1,'An intentional crossfade may retain its actual outgoing video while the new clip loads');
context.ambienceFade=null;context.ambienceFadeProgress=()=>1;
context.state.videoMode='opening';context.applyMode();assert.equal(context.visibleImage.visible,true,'Logo compositions do not require an MP4 decoder');

const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};};
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const prepareMatch=source.match(/prepare:async snapshot=>\{([^]*?)\n  \},\n  exportOffline:/);
assert.ok(prepareMatch,'Actual isolated-export prepare callback exists');
const pending=new Map(),fontLoads=[];
const fonts={ready:Promise.resolve(),load(font,text){fontLoads.push([font,text]);const item=deferred();pending.set(font,item);return item.promise;}};
const originalDocument=globalThis.document;
globalThis.document={fonts};
try{
 const exportContext={
  state:{videoOn:true,videoMode:'warm'},document:{fonts,querySelector:()=>null},preloadVisualFonts,createExportPlan,plan:null,renderExportFrame:async()=>{},
  lightingEditor:{restoreTemporaryScene(){}},controls:{update(){}},cameraCutaway(){},renderFixtures(){},drawVJ(){},renderRoom(){},
  elapsed:0,transition:null,lastVideoKey:'',last:0,performance:{now:()=>100},eventLogo:{naturalWidth:1254,decode:()=>Promise.resolve()}
 };
 vm.createContext(exportContext);vm.runInContext('globalThis.prepare=async snapshot=>{'+prepareMatch[1]+'\n};',exportContext);
 let finished=false;
 const preparing=exportContext.prepare({view:{videoOn:true,videoMode:'warm'},duration:30,name:'Jaune'}).then(value=>{finished=true;return value;});
 await tick();assert.equal(finished,false,'A ready FontFaceSet alone is insufficient: export waits for requested faces');
 assert.equal(fontLoads.length,2,'Warm preloads both first-word handwriting and second-word rounded face');
 const holiday=[...pending.keys()].find(font=>font.includes('GR Holiday')),joy=[...pending.keys()].find(font=>font.includes('GR Joy'));
 assert.ok(holiday&&joy);pending.get(holiday).resolve([{}]);await tick();assert.equal(finished,false,'The later JOIE word is ready before exporting frame0');
 pending.get(joy).resolve([{}]);const output=await preparing;assert.equal(output.durationSeconds,30);assert.equal(finished,true);
 const count=fontLoads.length;await preloadVisualFonts('warm');assert.equal(fontLoads.length,count,'Repeated export uses the same loaded font promises');
 const decoding=deferred();let decodeCount=0;exportContext.state.videoMode='opening';exportContext.eventLogo={naturalWidth:0,decode(){decodeCount++;return decoding.promise;}};
 finished=false;const logoPreparing=exportContext.prepare({view:{videoOn:true,videoMode:'opening'},duration:20,name:'Ouverture'}).then(()=>{finished=true;});
 await tick();assert.equal(decodeCount,1);assert.equal(finished,false,'Export cannot start with a missing first-frame event logo');
 exportContext.eventLogo.naturalWidth=1254;decoding.resolve();await logoPreparing;assert.equal(finished,true);
 exportContext.eventLogo={naturalWidth:0,decode:()=>Promise.resolve()};
 await assert.rejects(exportContext.prepare({view:{}}),/logo du visuel/,'A failed logo does not produce a silent incomplete export');
 exportContext.state.videoMode='pinky';const rejected=exportContext.prepare({view:{videoOn:true,videoMode:'pinky'}});await tick();
 pending.get([...pending.keys()].find(font=>font.includes('GR Love'))).reject(new Error('font network failure'));
 await assert.rejects(rejected,/police du visuel/,'A missing custom font reports failure instead of exporting fallback typography');
}finally{if(originalDocument===undefined)delete globalThis.document;else globalThis.document=originalDocument;}
console.log('Projection readiness: actual settings callback keeps first-frame gating; isolated export waits for all thematic fonts and decoded logo before frame0, with explicit asset failures.');
