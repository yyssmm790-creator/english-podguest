"""Original guitar-style background tracks; NumPy + ffmpeg, no external recordings.
Only needed to regenerate assets; not part of deployment/build.
"""
from pathlib import Path
import json, subprocess, tempfile, wave
import numpy as np
RATE=24000
root=Path(__file__).resolve().parents[1]
out=root/'public/audio'
cache={}
def tone(midi):
 if midi in cache:return cache[midi]
 t=np.arange(int(RATE*2.3))/RATE
 f=440*2**((midi-69)/12)
 s=np.zeros(len(t))
 for h in range(1,8):s+=np.sin(h*np.pi*.21)/h**1.35*np.sin(2*np.pi*f*h*t)*np.exp(-t*(.8+h*.45))
 s*=1-np.exp(-t*200)
 s/=max(.1,np.max(np.abs(s)))
 cache[midi]=s
 return s
names=['햇살이 드는 카페','느긋한 아침','창가에 앉아서','따뜻한 커피 한 잔','오후의 산책','조용한 책방','비 오는 날의 창가','작은 쉼표','노을이 머무는 시간','오늘의 이야기']
progressions=[[[48,55,59,64],[45,55,60,64],[41,57,60,64],[43,57,62,67]],[[50,57,61,66],[47,57,62,66],[43,59,62,66],[45,59,64,69]],[[45,52,55,60],[41,53,57,60],[48,55,60,64],[43,55,59,62]],[[43,50,54,59],[40,52,55,59],[48,55,59,64],[50,57,62,66]],[[41,53,57,60],[45,52,57,60],[50,57,60,65],[43,55,59,62]]]
tracks=[]
for n,name in enumerate(names):
 rng=np.random.default_rng(910+n)
 bpm=[78,82,74,80,76,84,72,81,75,79][n]
 beat=60/bpm
 bars=round(120/(4*beat));duration=bars*4*beat
 mix=np.zeros((int(duration*RATE),2),dtype=np.float64)
 chords=progressions[n%len(progressions)]
 patterns=[[0,2,1,3,0,1,2,3],[0,1,3,2,0,2,1,3],[0,3,1,2,0,2,3,1]]
 for bar in range(bars):
  chord=chords[(bar+n//5)%4]
  pattern=patterns[(bar//4+n)%3]
  for step,string in enumerate(pattern):
   if step in (3,7) and (bar+n)%5==0:continue
   start=max(0,int((bar*4+step*.5)*beat*RATE+rng.uniform(-.008,.008)*RATE))
   midi=chord[string]
   if n>=5 and string==3 and bar%4==3:midi-=2
   sample=tone(midi);count=min(len(sample),len(mix)-start)
   if count<=0:continue
   strength=(.32 if string==0 else .23)*rng.uniform(.8,1.1)
   pan=(string-1.5)*.2
   mix[start:start+count]+=sample[:count,None]*strength*np.array([np.sqrt((1-pan)/2),np.sqrt((1+pan)/2)])
 for delay,gain in [(.052,.1),(.103,.055)]:
  offset=int(delay*RATE);mix[offset:]+=mix[:-offset,::-1]*gain
 rms=np.sqrt(np.mean(mix**2));mix*=.11/max(rms,.001)
 mix=np.tanh(mix)
 fade=int(2.5*RATE);mix[:fade]*=np.linspace(0,1,fade)[:,None];mix[-fade:]*=np.linspace(1,0,fade)[:,None]
 filename=f'cafe-acoustic-{n+1:02d}.mp3'
 with tempfile.TemporaryDirectory() as temporary:
  wav=Path(temporary)/'track.wav'
  with wave.open(str(wav),'wb') as w:
   w.setnchannels(2);w.setsampwidth(2);w.setframerate(RATE);w.writeframes((mix*32767).astype('<i2').tobytes())
  subprocess.run(['ffmpeg','-y','-loglevel','error','-i',str(wav),'-codec:a','libmp3lame','-b:a','96k','-threads','1',str(out/filename)],check=True)
 tracks.append({'title':name,'src':f'./audio/{filename}','seconds':round(duration)})
 print(f'{n+1}/10 {name}: {duration:.0f}s',flush=True)
(root/'public/music-tracks.js').write_text('const CAFE_TRACKS = '+json.dumps(tracks,ensure_ascii=False,indent=1)+';\n')
