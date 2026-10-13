// Small session-only history. A continuous slider gesture is one undo step.
export function createEditHistory(limit=40){
 let current='',past=[],future=[],gesture=null;
 const encode=value=>JSON.stringify(value);
 return {
  reset(value){current=encode(value);past=[];future=[];gesture=null;},
  record(value,key=null){const next=encode(value);if(next===current)return false;
   if(!key||key!==gesture){past.push(current);if(past.length>limit)past.shift();}
   current=next;future=[];gesture=key;return true;},
  endGesture(){gesture=null;},
  undo(){if(!past.length)return null;future.push(current);current=past.pop();gesture=null;return JSON.parse(current);},
  redo(){if(!future.length)return null;past.push(current);current=future.pop();gesture=null;return JSON.parse(current);},
  get canUndo(){return past.length>0;},get canRedo(){return future.length>0;}
 };
}
