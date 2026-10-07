from pathlib import Path
p=Path('scene.js');s=p.read_text(encoding='utf-8');s="import {drawEventVisual} from './event-motion.js';\n"+s
a=s.index('function drawVJ(t)');b=s.index('\nconst decorative=',a)
s=s[:a]+'''function drawVJ(t){if(state.videoOn)drawEventVisual(ctx,eventLogo,t);else{ctx.fillStyle='#000000';ctx.fillRect(0,0,512,512);}vjTexture.needsUpdate=true;}
'''+s[b:]
s=s.replace('boucle de 10 secondes','boucle de 12 secondes').replace('Grand_Slam_Boucle_10s.mp4','Grand_Slam_Boucle_12s.mp4');p.write_text(s,encoding='utf-8')
p=Path('build_site.cjs');s=p.read_text(encoding='utf-8').replace('Grand_Slam_Boucle_10s.mp4','Grand_Slam_Boucle_12s.mp4');p.write_text(s,encoding='utf-8')
