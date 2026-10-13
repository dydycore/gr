import assert from 'node:assert/strict';
import {createTimelineEditor} from './timeline-editor.js';
import {sanitizeFixtureTimeline,timelineDuration} from './fixture-timeline.js';

// Run real widget actions with a minimal DOM; data cleaning and handlers are
// unmocked. The test catches disabled controls independently of the pure engine.
const nodes=new Map(),elements=[];
class Element{
 constructor(tag='div'){this.tagName=tag;this.children=[];this.attrs=new Map();this.dataset={};this.value='';this.style={setProperty(){}};elements.push(this);}
 set innerHTML(html){for(const match of html.matchAll(/<([a-z]+)\b([^>]*)>/gi)){const el=new Element(match[1]);for(const a of match[2].matchAll(/([\w-]+)="([^"]*)"/g))el.setAttribute(a[1],a[2]);}}
 setAttribute(name,value){this.attrs.set(name,String(value));if(name==='id'){this.id=value;nodes.set(value,this);}if(name==='value')this.value=value;if(name.startsWith('data-'))this.dataset[name.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]=value;}
 getAttribute(name){return this.attrs.get(name)??null;}
 appendChild(el){this.children.push(el);if(el.id)nodes.set(el.id,el);return el;}
 append(...els){els.forEach(el=>this.appendChild(el));}
 replaceChildren(){this.children=[];}
 querySelector(selector){return nodes.get(selector.slice(1));}
 querySelectorAll(selector){const attribute=selector.match(/^\[([^\]]+)\]$/)?.[1];return attribute?elements.filter(el=>el.attrs.has(attribute)):[];}
}
globalThis.document={createElement:tag=>new Element(tag),head:new Element('head'),getElementById:id=>nodes.get(id)||null};
const fixture={id:'101',kind:'moving',notUsed:false};
let timeline=sanitizeFixtureTimeline({enabled:true,steps:Array.from({length:4},(_,i)=>({id:'existing-'+i,duration:7.5,transition:'fade',fadeIn:1,fadeOut:.5,color:i%2?'#ff3030':'#35dcff',fx:{dimmer:70,gobo:6,movement:'circle'}}))}),changes=0;
const editor=createTimelineEditor({host:new Element(),selectedFixture:()=>fixture,getTimeline:()=>timeline,setTimeline:(f,next)=>{timeline=sanitizeFixtureTimeline(next,f.kind);},getCurrentSettings:()=>({color:'#ff40cb',fx:{dimmer:55,gobo:7,movement:'eight',period:15}}),onSelectBlock(){},onChange(){changes++;},onPlayback(){},getPlayback:()=>true});
editor.sync();
const add=nodes.get('timeline-add'),duplicate=nodes.get('timeline-duplicate'),remove=nodes.get('timeline-remove');
assert.equal(add.disabled,false,'Ajouter is available with4 blocks already filling30 seconds');
assert.equal(duplicate.disabled,false,'Dupliquer is also available at30 seconds');
add.onclick();assert.equal(changes,1,'Add notifies the persistence callback');assert.equal(timeline.steps.length,5);assert.equal(editor.index(),1);
assert.equal(timeline.steps[1].duration,2);assert.equal(timeline.steps[1].color,'#ff40cb');assert.equal(timeline.steps[1].fx.movement,'eight');
assert.ok(Math.abs(timelineDuration(timeline)-30)<1e-7);assert.match(nodes.get('timeline-message').textContent,/durées ajustées/);
duplicate.onclick();assert.equal(changes,2);assert.equal(timeline.steps.length,6);assert.equal(editor.index(),2);
assert.equal(timeline.steps[2].duration,2);assert.equal(timeline.steps[2].color,'#ff40cb');assert.equal(timeline.steps[2].fx.gobo,7);
assert.notEqual(timeline.steps[1].id,timeline.steps[2].id,'Duplicate gets its own block identity');
remove.onclick();assert.equal(changes,3);assert.equal(timeline.steps.length,5);assert.equal(add.disabled,false);
while(timeline.steps.length<10)add.onclick();
assert.equal(add.disabled,false);assert.equal(duplicate.disabled,false);assert.notEqual(add.hidden,true,'Actions remain visible and clickable at the cap');
const fullSnapshot=JSON.stringify(timeline),fullChanges=changes;
add.onclick();duplicate.onclick();
assert.equal(JSON.stringify(timeline),fullSnapshot,'Clicking at10 blocks leaves the sequence intact');assert.equal(changes,fullChanges,'No persistence or edit notification for a rejected11th block');
assert.equal(nodes.get('timeline-message').textContent,'Il y a déjà 10 blocs. Retirez-en un pour ajouter une couleur.');
remove.onclick();assert.equal(add.disabled,false);assert.equal(duplicate.disabled,false,'Removing a block reopens both actions');
fixture.notUsed=true;editor.sync();const before=changes;assert.equal(add.disabled,true);add.onclick();assert.equal(changes,before,'Inactive fixture cannot be changed');
delete globalThis.document;
console.log('Timeline editor: add and duplicate at30s, new block selection, preserved settings, persistence callback,10-block message and remove/re-add passed.');
