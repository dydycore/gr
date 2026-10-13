// Stop GPU work offscreen and at rest without changing rendering quality.
// A small idle poll notices decoded video/font assets even on older browsers.
export function createRenderScheduler({onFrame,canRun=()=>true,isAnimating=()=>true,revision=()=>0,onSuspend=()=>{},onResume=()=>{},now=()=>performance.now(),requestFrame=callback=>requestAnimationFrame(callback),cancelFrame=id=>cancelAnimationFrame(id),setTimer=(callback,delay)=>setTimeout(callback,delay),clearTimer=id=>clearTimeout(id),idleDelay=200}){
 let raf=null,timer=null,suspended=true,suspendedAt=null,disposed=false,version=1,drawn=0,lastRevision;
 function cancel(){if(raf!==null){cancelFrame(raf);raf=null;}if(timer!==null){clearTimer(timer);timer=null;}}
 function available(stamp){
  if(disposed)return false;
  if(!canRun()){
   cancel();if(!suspended){suspended=true;suspendedAt=stamp;onSuspend(stamp);}return false;
  }
  if(suspended){suspended=false;version++;const elapsed=suspendedAt===null?0:Math.max(0,stamp-suspendedAt);suspendedAt=null;onResume(elapsed,stamp);}
  return true;
 }
 function request(){if(raf===null&&!disposed)raf=requestFrame(tick);}
 function tick(stamp){
  raf=null;if(!available(stamp))return;
  const before=version,changed=drawn!==version||lastRevision!==revision(),continuous=!!isAnimating(stamp);
  if((changed||continuous)&&onFrame(stamp,{continuous,dirty:changed})!==false){drawn=before;lastRevision=revision();}
  if(drawn!==version||isAnimating(stamp))request();
  else if(timer===null)timer=setTimer(()=>{timer=null;if(available(now()))request();},idleDelay);
 }
 return {
  invalidate(){version++;this.reconcile();},
  reconcile(){if(!available(now()))return;if(timer!==null){clearTimer(timer);timer=null;}request();},
  dispose(){disposed=true;cancel();},
  get suspended(){return suspended;}
 };
}
