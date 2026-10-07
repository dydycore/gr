from pathlib import Path
from PIL import Image,ImageDraw
import math,subprocess,json
r=Path(__file__).resolve().parent;(r/'media').mkdir(exist_ok=True)
logo=Image.open(r'C:/Users/VJSDMT~1/AppData/Local/Temp/codex-clipboard-265840a7-c693-4ace-b931-e117144d63ae.png').convert('RGB')
N=1080
out=r/'media/Grand_Slam_Boucle_10s.mp4'
cmd=['ffmpeg','-y','-v','error','-f','rawvideo','-pix_fmt','rgb24','-s','1080x1080','-r','30','-i','-','-an','-c:v','libx264','-preset','medium','-crf','18','-pix_fmt','yuv420p','-movflags','+faststart',str(out)]
p=subprocess.Popen(cmd,stdin=subprocess.PIPE)
def frame(i):
    phase=i/300*2*math.pi;im=Image.new('RGB',(N,N),'white');d=ImageDraw.Draw(im);s=N/512
    size=round((420+6*math.sin(phase))*s);im.paste(logo.resize((size,size),Image.Resampling.LANCZOS),((N-size)//2,(N-size)//2));d=ImageDraw.Draw(im)
    for j in range(2):
        rx=(235-j*9)*s;ry=(213-j*9)*s;a=math.degrees(phase+j*math.pi)
        d.arc((N/2-rx,N/2-ry,N/2+rx,N/2+ry),a,a+math.degrees(1.25),fill='#bde6e8',width=2)
    for j in range(3):
        a=phase+j*2*math.pi/3;x=N/2+235*s*math.cos(a);y=N/2+213*s*math.sin(a);radius=2.2*s
        d.ellipse((x-radius,y-radius,x+radius,y+radius),fill='#1e2728' if j==1 else '#159ba6')
    return im
for i in range(300):
    im=frame(i)
    if i==0:im.save(r/'media/Grand_Slam_Apercu.png')
    data=memoryview(im.tobytes())
    while data:
        written=p.stdin.write(data[:1048576]);data=data[written:]
p.stdin.close();assert p.wait()==0
assert frame(0).tobytes()==frame(300).tobytes()
probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_entries','stream=width,height,nb_frames,r_frame_rate,pix_fmt:format=duration','-of','json',str(out)]))
subprocess.run(['ffmpeg','-v','error','-i',str(out),'-f','null','-'],check=True)
(r/'media/VERIFICATION_CLIP.json').write_text(json.dumps({'probe':probe,'decode':'passed','periodicEndFrameMatchesStart':True,'source':'Image fournie, typographie conservee','animation':'Pulsation douce, arcs et points turquoise ; boucle 10 s'},indent=2),encoding='utf-8')
print(probe)
