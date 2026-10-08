// Reuse the keyboard travel loop: no second animation timer, and no movement
// may survive a released/cancelled pointer or a hidden page.
export function bindTouchTravel({buttons,keys,step,invalidate,window,document}){
 const active=new Map();
 const stop=button=>{const code=active.get(button);if(code){keys.delete(code);active.delete(button);button.setAttribute('aria-pressed','false');}};
 const stopAll=()=>{for(const button of active.keys())stop(button);};
 for(const button of buttons){
  const code=button.dataset.travel==='forward'?'TouchForward':'TouchBack';
  button.addEventListener('pointerdown',e=>{
   if(e.button!==0||active.has(button))return;e.preventDefault();button.focus();
   button.setPointerCapture?.(e.pointerId);active.set(button,code);keys.add(code);
   button.setAttribute('aria-pressed','true');step(.055);invalidate();
  });
  for(const event of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(event,()=>stop(button));
  button.addEventListener('click',e=>{if(e.detail!==0)return;keys.add(code);step(.11);keys.delete(code);invalidate();});
 }
 window.addEventListener('blur',stopAll);
 document.addEventListener('visibilitychange',()=>{if(document.hidden)stopAll();});
 return {stop:stopAll};
}
