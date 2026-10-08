// Limit expensive GPU renders without changing the scene, shadows or resolution.
// A time-based schedule avoids an accidental 25 FPS ceiling on 75 Hz monitors.
export function createFrameLimiter(initialFps=30){
 let fps=initialFps===60?60:30;
 let nextFrameAt=null;
 return {
  get fps(){return fps;},
  setFps(value){fps=Number(value)===60?60:30;nextFrameAt=null;},
  reset(){nextFrameAt=null;},
  shouldRender(now){
   if(!Number.isFinite(now))return false;
   const interval=1000/fps;
   if(nextFrameAt!==null&&now+.5<nextFrameAt)return false;
   if(nextFrameAt===null||now-nextFrameAt>interval)nextFrameAt=now+interval;
   else nextFrameAt+=interval;
   return true;
  }
 };
}
