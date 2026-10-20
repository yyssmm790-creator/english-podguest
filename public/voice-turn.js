// Local volume-based turn detection. It does not transcribe or understand speech.
export class VoiceTurnDetector {
 constructor({ silenceMs=3000, minSpeechMs=350, threshold=.012 }={}) {
  this.silenceMs=silenceMs;this.minSpeechMs=minSpeechMs;this.threshold=threshold;this.reset();
 }
 reset(now=0) { this.lastSample=now;this.lastVoice=now;this.voicedMs=0;this.hasSpeech=false;this.ended=false;this.noiseFloor=.002; }
 observe(rms, now) {
  if(this.ended)return false;
  const elapsed=Math.max(0,Math.min(100,now-this.lastSample));this.lastSample=now;
  if(!Number.isFinite(rms)||rms<0)return false;
  const gate=Math.max(this.threshold,this.noiseFloor*3);
  if(rms>=gate){
   this.voicedMs+=elapsed;this.lastVoice=now;
   if(this.voicedMs>=this.minSpeechMs)this.hasSpeech=true;
  }else{
   if(rms<this.threshold)this.noiseFloor=this.noiseFloor*.95+rms*.05;
   if(!this.hasSpeech && now-this.lastVoice>200)this.voicedMs=0;
  }
  if(this.hasSpeech && now-this.lastVoice>=this.silenceMs){this.ended=true;return true;}
  return false;
 }
}
