// Stable screen-space placement, retaining every in-frame fixture number.
export function placeLabels(items,width,height){
 const placed=[],clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 const overlap=(a,b)=>Math.max(0,Math.min(a.x+a.w/2,b.x+b.w/2)-Math.max(a.x-a.w/2,b.x-b.w/2)+4)*Math.max(0,Math.min(a.y+a.h/2,b.y+b.h/2)-Math.max(a.y-a.h/2,b.y-b.h/2)+3);
 return items.map(item=>{
  let best=null,score=Infinity;
  const offsets=item.fixture?[-18,4,-40,26,-62,48,-84,70]:[0,-20,20];
  for(const dy of offsets)for(const dx of item.fixture?[0,-48,48]:[0,-24,24]){
   const candidate={...item,x:clamp(item.x+dx,item.w/2+3,width-item.w/2-3),y:clamp(item.y+dy,item.h/2+3,height-item.h/2-3)};
   const cost=placed.reduce((sum,other)=>sum+overlap(candidate,other)*100,0)+Math.abs(dy+(item.fixture?18:0))+Math.abs(dx)*.4;
   if(cost<score){score=cost;best=candidate;}
  }
  placed.push(best);return best;
 });
}
