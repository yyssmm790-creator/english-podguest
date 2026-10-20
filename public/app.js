const $ = (id) => document.getElementById(id);
const examples = {
 coffee: { story: '오늘 애들 보내고 혼자 카페에 가서 커피를 마셨어. 잠깐이지만 조용히 나만의 시간을 보내니까 너무 좋더라. 딱 10분이었는데 정말 필요한 시간이었어.', lines: [['I had some coffee alone today.', '오늘 혼자 커피를 마셨어요.'], ['It was quiet. And I loved it.', '조용했어요. 그게 참 좋았어요.'], ['Just ten minutes for myself.', '딱 10분, 나만의 시간.'], ['I really needed that.', '정말 필요한 시간이었어요.']], turns: [['What did you do this morning?', '오늘 아침에 뭐 했어?', 0], ['Oh, nice. How was it?', '오, 좋네. 어땠어?', 1], ['Mm, that sounds lovely. Was it a short break?', '음, 참 좋았겠다. 잠깐 쉬었던 거야?', 2], ['I get that. Did it help you feel better?', '그 마음 알 것 같아. 기분이 좀 나아졌어?', 3]] },
 work: { story: '오늘 회사에서 일이 많아서 조금 지쳤어. 집에 와서 좋아하는 음악을 들으며 쉬었어. 내일은 조금 더 괜찮은 하루였으면 좋겠어.', lines: [['I had a long day at work.', '오늘 회사에서 긴 하루를 보냈어요.'], ['I felt a little tired.', '조금 지쳤어요.'], ['So I listened to my favorite music at home.', '그래서 집에서 좋아하는 음악을 들었어요.'], ['I hope tomorrow is a better day.', '내일은 더 좋은 하루이길 바라요.']], turns: [['How was your day at work?', '오늘 회사에서 어땠어?', 0], ['Oh... a long day. How did you feel?', '아… 긴 하루였구나. 기분이 어땠어?', 1], ['Mm, I hear you. What did you do after work?', '음, 그랬구나. 퇴근하고는 뭐 했어?', 2], ['That sounds nice. How about tomorrow?', '음악으로 쉬었다니 좋네. 내일은 어떨 것 같아?', 3]] },
 walk: { story: '오늘 저녁에 동네를 산책했어. 바람이 시원하고 하늘이 참 예뻤어. 별일 없는 하루였지만 걷고 나니까 기분이 좋아졌어.', lines: [['I went for a walk this evening.', '오늘 저녁에 산책했어요.'], ['The air was cool. The sky was beautiful.', '바람은 시원했고 하늘은 참 예뻤어요.'], ['It was just a simple day.', '그냥 평범한 하루였어요.'], ['But that little walk made me happy.', '하지만 그 짧은 산책 덕분에 행복했어요.']], turns: [['What did you do this evening?', '오늘 저녁에 뭐 했어?', 0], ['Oh, a walk! What was it like outside?', '오, 산책했구나! 밖은 어땠어?', 1], ['Sounds lovely. Was it a special day?', '참 좋았겠다. 특별한 하루였어?', 2], ['Mm, I see. How did the walk make you feel?', '음, 그랬구나. 산책하고 나니 기분이 어땠어?', 3]] }
};
let selected = null, mode = 'podcast', turn = 0, hidden = false, conversationComplete = false;
let recorder = null, stream = null, audioURL = null, timeout = null;
let recordTimer = null, recordingStarted = 0, recordingEpoch = 0, recordPending = false, playbackActive = false;
let friendPerson = "female", cloudVoicesReady = false, speechAudio = null, speechAudioURL = null, speechRequest = null;
let readingRecognition=null, readingVersion=0;
let recognition = null, voiceActive = false, listening = false, continueAfterVoice = false;
let audioContext = null, soundEnabled = false, musicRequested = false, musicVersion = 0;
let speechActive = false, speechGeneration = 0, activeUtterance = null;
let speechStartTimer = null, speechEndTimer = null, speechQueueTimer = null;
const voicePlaybackFailures = new Set();
let responseTimer=null, responseVersion=0, conversationPending=false;
let meterFrame=null, meterSource=null, meterAnalyser=null;
let conversationRunning=false, conversationEpoch=0, conversationStream=null;
let sessionListenTimer=null, sessionLimitTimer=null, speechCompletion=null, sessionQuestionVersion=0;
const turnDetector=new VoiceTurnDetector();
const orbForms=[{id:'glow',name:'따뜻한 빛'},{id:'ripple',name:'잔잔한 물결'},{id:'cloud',name:'부드러운 구름'}];
const conversationEndings={
 coffee:["Mm, I'm glad you had a little time for yourself.",'음, 잠깐이라도 나만의 시간을 가졌다니 좋다.'],
 work:["I hope so too. Take it easy tonight.",'나도 그랬으면 좋겠어. 오늘 밤은 편히 쉬어.'],
 walk:["That's lovely. A little walk can make a big difference.",'참 좋다. 짧은 산책도 큰 힘이 될 수 있네.']
};
function chooseOrbForm(manual=false) {
 const current=$('friend-portrait').dataset.form;
 const options=manual?orbForms.filter(form=>form.id!==current):orbForms;
 const form=options[Math.floor(Math.random()*options.length)];
 $('friend-portrait').dataset.form=form.id;$('orb-form-name').textContent=form.name;
 $('change-form').setAttribute('aria-label',`AI 모습 바꾸기. 현재 ${form.name}`);
 updateOrbState();
}
$('change-form').onclick=()=>chooseOrbForm(true);
function updateOrbState() {
 const scene=$('friend-portrait');
 const state=speechActive?'speaking':recorder?.state==='recording' && mode==='friend'?'listening':recordPending?'connecting':conversationPending || listening?'thinking':playbackActive?'reviewing':'ready';
 const labels={ready:conversationComplete?'오늘 이야기를 들려줘서 고마워요.':'시작을 누르면 먼저 이야기할게요.',listening:'듣고 있어요. 천천히 말해도 괜찮아요.',thinking:'음… 잠깐 생각하고 있어요.',speaking:'당신의 이야기에 답하고 있어요.',connecting:'마이크를 연결하고 있어요.',reviewing:'녹음한 내 이야기를 들어보고 있어요.'};
 scene.dataset.state=state;
 if($('friend-presence').textContent!==labels[state])$('friend-presence').textContent=labels[state];
 $('orb-field').setAttribute('aria-label',`${$('orb-form-name').textContent}. ${labels[state]}`);
}
function stopMicMeter() {
 if(meterFrame!==null)cancelAnimationFrame(meterFrame);meterFrame=null;
 meterSource?.disconnect();meterAnalyser?.disconnect();meterSource=null;meterAnalyser=null;
 $('friend-portrait').style.setProperty('--level','0');
 $('studio-record').style.setProperty('--mic-level','0');
 $('mic-level-fill').style.width='0%';
 $('live-voice').classList.remove('voice-detected');
 document.querySelectorAll('.voice-wave i').forEach(bar=>bar.style.setProperty('--voice-height','.08'));
}
function startMicMeter(micStream) {
 stopMicMeter();
 try {
  const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;
  audioContext??=new Audio();audioContext.resume().catch(()=>{});
  meterSource=audioContext.createMediaStreamSource(micStream);meterAnalyser=audioContext.createAnalyser();meterAnalyser.fftSize=512;
  meterSource.connect(meterAnalyser); // Never connect the microphone to speakers.
  const samples=new Float32Array(meterAnalyser.fftSize);let level=0,lastVoiceUI=0;
 const voiceBars=[...document.querySelectorAll('.voice-wave i')];
  const tick=()=>{
   if(!meterAnalyser)return;
   meterAnalyser.getFloatTimeDomainData(samples);let square=0;for(const value of samples)square+=value*value;
   const rms=Math.sqrt(square/samples.length);
   const isListening=recorder?.state==='recording';
   voiceBars.forEach((bar,index)=>{const start=index*Math.floor(samples.length/voiceBars.length),end=start+Math.floor(samples.length/voiceBars.length);let energy=0;for(let j=start;j<end;j++)energy+=samples[j]*samples[j];bar.style.setProperty('--voice-height',String(isListening?Math.max(.08,Math.min(1,Math.sqrt(energy/(end-start))*12)):.08));});
   if(isListening && performance.now()-lastVoiceUI>350){lastVoiceUI=performance.now();const detected=rms>.015;$('live-voice').classList.toggle('voice-detected',detected);const label=detected?'목소리가 들려요':'듣고 있어요 · 편하게 말해주세요';if($('live-voice-label').textContent!==label)$('live-voice-label').textContent=label;}
   if(mode==='friend' && conversationRunning && recorder?.state==='recording' && turnDetector.observe(rms,performance.now())){stopRecording();return;}
   level=level*.65+Math.min(1,rms*8)*.35;
   $('friend-portrait').style.setProperty('--level',level.toFixed(3));
   $('studio-record').style.setProperty('--mic-level',level.toFixed(3));
   if(mode==='podcast'){const status=rms>.015?'● 목소리 감지 중 · 녹음 중':'● 마이크 연결됨 · 녹음 중';if($('mic-status').textContent!==status)$('mic-status').textContent=status;}
   $('mic-level-fill').style.width=`${Math.round(level*100)}%`;
   meterFrame=requestAnimationFrame(tick);
  };tick();return true;
 }catch{stopMicMeter();return false;}
}
function cancelConversationResponse() {
 clearTimeout(responseTimer);responseTimer=null;responseVersion++;conversationPending=false;updateOrbState();
}
function queueConversationResponse(){
 if(mode!=='friend' || !conversationRunning || $('practice-panel').hidden)return;
 cancelConversationResponse();const version=responseVersion;
 conversationPending=true;updateOrbState();$('practice-status').textContent='이야기를 들었어요. 다음 질문으로 이어갈게요.';
 responseTimer=setTimeout(()=>{
  if(version!==responseVersion || !conversationRunning || mode!=='friend' || $('practice-panel').hidden)return;
  responseTimer=null;conversationPending=false;hidden=false;
  if(turn<examples[selected].turns.length-1)turn++;else conversationComplete=true;
  renderPractice();playSessionQuestion(conversationEpoch);
 },650);
}
function finishSpeech(success) {
 const resolve=speechCompletion;speechCompletion=null;if(resolve)resolve(success);
}
function endConversation(message='대화를 멈췄어요. 시작을 누르면 이어갈 수 있어요.') {
 conversationRunning=false;recordPending=false;conversationEpoch++;sessionQuestionVersion++;updateRecordingUI();
 clearTimeout(sessionListenTimer);clearTimeout(sessionLimitTimer);sessionListenTimer=null;sessionLimitTimer=null;
 cancelConversationResponse();stopSpeech();stopRecording();
 conversationStream?.getTracks().forEach(track=>track.stop());conversationStream=null;
 recordPending=false;updateRecordingUI();updateAmbience();
 if(message)$('practice-status').textContent=message;
}
async function startConversation() {
 if(conversationRunning)return;
 const profile=VOICE_CATALOG.find(voice=>voice.id===$('friend-voice').value && voice.gender===friendPerson);
 if(!profile || (!cloudVoicesReady && !matchingLocalVoice(profile))){notice('먼저 ‘목소리’에서 재생 가능한 음성을 선택해 주세요.');return;}
 if(!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder || !(window.AudioContext||window.webkitAudioContext)){
  notice('대화는 마이크를 사용할 수 있는 Chrome 또는 Edge에서 열어주세요.');return;
 }
 cancelConversationResponse();stopSpeech();$('recording-result').querySelector('audio')?.pause();
 conversationRunning=true;const epoch=++conversationEpoch;recordPending=true;updateRecordingUI();updateAmbience();
 $('practice-status').textContent='마이크를 허용하면 AI가 먼저 질문해요.';
 let mic;
 try {
  const Audio=window.AudioContext||window.webkitAudioContext;audioContext??=new Audio();await audioContext.resume();
  if(epoch!==conversationEpoch || !conversationRunning)return;
  mic=await navigator.mediaDevices.getUserMedia({audio:true});
  if(epoch!==conversationEpoch || !conversationRunning){mic.getTracks().forEach(track=>track.stop());return;}
  conversationStream=mic;stream=mic;recordPending=false;
  for(const track of mic.getAudioTracks())track.addEventListener('ended',()=>{if(conversationRunning && epoch===conversationEpoch)endConversation('마이크 연결이 끊어졌어요. 연결을 확인하고 다시 시작해 주세요.');},{once:true});
  if(conversationComplete){turn=0;conversationComplete=false;hidden=false;resetAudio();}
  renderPractice();updateAmbience();notice();
  sessionLimitTimer=setTimeout(()=>{if(epoch===conversationEpoch)endConversation('대화를 잠시 마쳤어요. 시작을 눌러 이어가세요.');},300000);
  await playSessionQuestion(epoch);
 }catch{
  mic?.getTracks().forEach(track=>track.stop());
  if(epoch===conversationEpoch){endConversation('마이크 권한을 확인한 뒤 시작을 다시 눌러주세요.');notice('마이크를 허용해야 대화를 시작할 수 있어요.');}
 }
}
async function playSessionQuestion(epoch) {
 if(!conversationRunning || epoch!==conversationEpoch)return;
 const version=++sessionQuestionVersion;
 const ok=await speak($('question-en').textContent);
 if(!conversationRunning || epoch!==conversationEpoch || version!==sessionQuestionVersion)return;
 if(!ok){endConversation('음성을 재생하지 못해 대화를 멈췄어요. 목소리를 확인하고 다시 시작해 주세요.');return;}
 if(conversationComplete){endConversation('오늘의 대화를 마쳤어요. 다시 시작하거나 내 답변을 들어보세요.');return;}
 sessionListenTimer=setTimeout(async()=>{
  sessionListenTimer=null;
  if(!conversationRunning || epoch!==conversationEpoch)return;
  const started=await startRecording({session:true});
  if(!started && conversationRunning && epoch===conversationEpoch)endConversation('마이크를 확인하고 다시 시작해 주세요.');
 },350);
}
function skipConversationTurn() {
 sessionQuestionVersion++;cancelConversationResponse();clearTimeout(sessionListenTimer);sessionListenTimer=null;
 recordingEpoch++;stopRecording();stopSpeech();resetAudio();
 turn=(turn+1)%examples[selected].turns.length;conversationComplete=false;hidden=false;renderPractice();
 if(conversationRunning)playSessionQuestion(conversationEpoch);
}
function updateAmbience() {
 const quiet=conversationRunning || speechActive || voiceActive || playbackActive || recorder?.state==='recording';
 const music=$('cafe-music');music.volume=.25;music.muted=quiet;
 $('sound-state').textContent=soundEnabled?'ON':'OFF';
 $('sound').setAttribute('aria-pressed',String(musicRequested));
 $('sound').setAttribute('aria-label',musicRequested?'카페 음악 끄기':'카페 음악 켜기');
 $('sound').title=quiet && soundEnabled?'듣기와 말하기 중에는 음악 소리만 잠시 줄여요.':'잔잔한 어쿠스틱 기타 음악을 반복해서 들어요.';
 const portrait = $("friend-portrait");
 if (portrait) { portrait.classList.toggle("speaking", speechActive && mode === "friend"); updateOrbState(); }
}
const notice = (message = '') => { $('notice').textContent = message; };
function count() { $('count').textContent = `${$('story').value.length.toLocaleString()} / 2,000`; }
function showWriting(focus=false) {
 $('writing-area').hidden=false;document.body.dataset.writing='true';
 if(focus)$('story').focus();
}
$('home').onclick=event=>{event.preventDefault();showStep(0);};
function stopSpeech() {
 finishSpeech(false);speechGeneration++; clearTimeout(speechStartTimer); clearTimeout(speechEndTimer); clearTimeout(speechQueueTimer); activeUtterance=null; speechRequest?.abort(); speechRequest=null;
 if(speechAudio){speechAudio.pause();speechAudio=null;}
 if(speechAudioURL){URL.revokeObjectURL(speechAudioURL);speechAudioURL=null;}
 if ('speechSynthesis' in window) window.speechSynthesis.cancel();
 listening=false;speechActive=false;updateAmbience();
}
function matchingLocalVoice(profile) {
 if(!profile || !('speechSynthesis' in window))return null;
 return speechSynthesis.getVoices().find(v=>/^en([_-]|$)/i.test(v.lang) && v.name.toLowerCase().split(/[^a-z]+/).includes(profile.name.toLowerCase())) || null;
}
async function speak(text) {
 if(listening){stopSpeech();return false;}
 const profile=VOICE_CATALOG.find(v=>v.id===$('friend-voice').value && v.gender===friendPerson);
 if(!profile){notice('이 목소리를 아직 사용할 수 없어요. 선택한 음성은 전용 음성 서비스 연결 후 이용할 수 있어요.');return false;}
 const local=matchingLocalVoice(profile);
 if(!cloudVoicesReady && !local){notice('지금은 이 목소리를 재생할 수 없어요. ‘친구 설정’에서 다른 목소리를 선택해 주세요.');return false;}
 stopSpeech();
 const generation=++speechGeneration;
 const completion=new Promise(resolve=>{speechCompletion=resolve;});
 const finish=()=>{if(generation!==speechGeneration)return;clearTimeout(speechStartTimer);clearTimeout(speechEndTimer);activeUtterance=null;listening=false;speechActive=false;updateAmbience();finishSpeech(true);};
 const fail=()=>{
  if(generation!==speechGeneration)return;
  voicePlaybackFailures.add(profile.id);stopSpeech();loadVoices();
  notice(`${profile.name} 목소리를 이 기기에서 재생하지 못했어요. 다른 목소리를 선택하거나 잠시 후 다시 시도해 주세요.`);
 };
 const started=()=>{
  if(generation!==speechGeneration)return;
  clearTimeout(speechStartTimer);voicePlaybackFailures.delete(profile.id);loadVoices();
  speechActive=true;updateAmbience();notice();
  speechEndTimer=setTimeout(fail,60000);
 };
 listening=true;updateOrbState();
 if(cloudVoicesReady){
  try {
   speechRequest=new AbortController();
   notice(`${profile.name} 목소리를 준비하고 있어요…`);speechStartTimer=setTimeout(fail,25000);
   const response=await fetch('/api/speech',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text,voice:profile.id}),signal:speechRequest.signal});
   if(!response.ok)throw new Error('speech_failed');
   const blob=await response.blob();if(generation!==speechGeneration)return;
   speechAudioURL=URL.createObjectURL(blob);speechAudio=new Audio(speechAudioURL);
   speechAudio.onended=finish;speechAudio.onerror=fail;
   await speechAudio.play();if(generation!==speechGeneration)return;
   started();
  }catch(error){if(generation!==speechGeneration)return;if(error.name!=='AbortError')fail();else finish();}
  return completion;
 }
 const utterance=new SpeechSynthesisUtterance(text);activeUtterance=utterance;utterance.lang=local.lang;utterance.rate=mode==='friend'?.92:.82;utterance.voice=local;
 utterance.onstart=started;
 utterance.onend=finish;
 utterance.onerror=fail;
 notice(`${profile.name} 목소리를 준비하고 있어요…`);
 speechStartTimer=setTimeout(fail,6000);
 // Let cancellation finish before queueing the new utterance, and retain it until completion.
 speechQueueTimer=setTimeout(()=>{
  if(generation!==speechGeneration)return;
  try { if(speechSynthesis.paused)speechSynthesis.resume();speechSynthesis.speak(utterance); }
  catch { fail(); }
 },120);
 return completion;
}
function speakQuestion() {
 const profile=VOICE_CATALOG.find(v=>v.id===$('friend-voice').value && v.gender===friendPerson);
 if(cloudVoicesReady || matchingLocalVoice(profile))speak($('question-en').textContent);
}
function stopRecording() {
 stopReadingFollow();
 clearTimeout(timeout); clearInterval(recordTimer); recordTimer = null;stopMicMeter();
 if (recorder?.state === 'recording') recorder.stop();
 if(!conversationRunning || stream!==conversationStream)stream?.getTracks().forEach(t => t.stop()); updateRecordingUI(); updateAmbience();
}
function updateRecordingUI() {
 const active = recorder?.state === 'recording';
 $('live-voice').hidden=!(active || recordPending || (mode==='friend' && conversationRunning));
 if(!active)$('live-voice-label').textContent=recordPending?'마이크 연결 중…':speechActive?'친구가 이야기하고 있어요':'질문을 들은 뒤 이야기해 주세요';
 $('studio-record').hidden=mode!=='podcast';
 $('studio-record').disabled=recordPending;
 $('studio-record').setAttribute('aria-pressed',String(active));
 $('studio-record').setAttribute('aria-label',active?'녹음을 마치고 일기장에 저장':'스튜디오 마이크 녹음 시작');
 $('studio-record-label').textContent=recordPending?'마이크 연결 중…':active?'녹음 중 · 눌러서 마치기':'마이크를 눌러 시작';
 $('record').hidden=mode==='podcast' && hidden;
 $('recording-feedback').hidden=mode!=='podcast' || (!active && !recordPending);
 $('visible-clock').hidden=hidden;
 if(recordPending)$('mic-status').textContent='마이크 연결 중 · 권한을 허용해 주세요';
 else if(active && mode==='podcast')$('mic-status').textContent='● 마이크 연결됨 · 녹음 중';
 $('recording-orb').classList.toggle('is-recording', active);
 $('recording-orb').classList.toggle('is-pending', recordPending);
 const running=mode==='friend'?conversationRunning:active;
 const label=mode==='friend'?(recordPending?'마이크 연결 중…':conversationRunning?'말하는 중…':'시작'):recordPending?'마이크 연결 중…':active?'녹음 마치기':'시작하기';
 const icon=mode==='friend'?'●':running?'■':'●';
 const labelElement=$('record').querySelector('.record-label');
 const iconElement=$('record').querySelector('.record-icon');
 if(labelElement.textContent!==label)labelElement.textContent=label;
 if(iconElement.textContent!==icon)iconElement.textContent=icon;
 $('record').disabled=mode==='friend'?(conversationRunning || recordPending):recordPending;
 $('record').classList.toggle('recording',running);
 $('record').dataset.state=running?'running':recordPending?'connecting':'ready';
 $('record').setAttribute('aria-pressed',String(running));
 $('record').setAttribute('aria-label',mode==='friend'?(running?'답변 듣는 중':'대화 시작'):label);
 $('next-question').disabled=recordPending;
 $('restart').disabled=conversationRunning;
 $('toggle-script').disabled = false;
 ['listen-practice','hear-question'].forEach(id=>$(id).disabled=conversationRunning || active || recordPending);
 $('preview-voice').disabled=conversationRunning || active || recordPending || (!cloudVoicesReady && !matchingLocalVoice(VOICE_CATALOG.find(v=>v.id===$('friend-voice').value)));
 $('friend-voice').disabled=conversationRunning;document.querySelectorAll('button[data-person]').forEach(button=>button.disabled=conversationRunning);
 $('hidden-title').textContent = recordPending ? '마이크 사용을 허용해 주세요.' : active ? '지금, 당신의 이야기를 담고 있어요.' : audioURL ? '내 목소리로 이야기를 완성했어요.' : '당신의 이야기를 들려주세요.';
 updateOrbState();
 $('hidden-help').textContent = recordPending ? '브라우저의 마이크 허용 창을 확인해 주세요. 허용하면 바로 녹음돼요.' : active ? '다 말했으면 마이크를 다시 눌러주세요.' : audioURL ? '아래에서 녹음한 이야기를 들어보세요.' : '막히면 언제든 대본을 다시 볼 수 있어요.';
}
function cancelRecordingSession() {
 if(conversationRunning || conversationStream)endConversation(null);
 cancelConversationResponse();recordingEpoch++; stopRecording(); recordPending=false; updateRecordingUI();
} 
function showStep(step) {
 pauseDiary(); stopSpeech(); cancelRecordingSession(); $('recording-result').querySelector('audio')?.pause(); continueAfterVoice=false; if (recognition) recognition.stop(); notice();
 document.body.dataset.screen=['input','choice','practice','diary'][step];
 ['input-panel','script-panel','practice-panel','diary-panel'].forEach((id,i) => $(id).hidden = i !== step);
 document.querySelectorAll('[data-step]').forEach((el,i) => { el.classList.toggle('active', i === step); if (i === step) el.setAttribute('aria-current','step'); else el.removeAttribute('aria-current'); });
 window.scrollTo({top:0,behavior:'instant'});
}
function fillLines(container, lines) {
 container.replaceChildren();
 for (const [en,ko] of lines) { const div = document.createElement('div'); div.className='script-line'; const p=document.createElement('p'); p.textContent=en; const small=document.createElement('small'); small.textContent=ko; div.append(p,small); container.append(div); }
}
function resetAudio() { const old=$('recording-result').querySelector('audio'); if(old)old.pause(); playbackActive=false; if (audioURL) URL.revokeObjectURL(audioURL); audioURL=null; $('recording-result').replaceChildren(); $('recording-clock').textContent='00:00';$('visible-clock').textContent='00:00'; updateAmbience(); }
function renderPractice() {
 const data=examples[selected];
 document.body.dataset.mode=mode;
 $('podcast-hero').hidden=mode!=='podcast';
 $('friend-question').hidden = mode !== 'friend';
 $('friend-person').hidden = mode !== 'friend';
 $('next-question').hidden = mode !== 'friend';
 $('practice-label').textContent=mode==='friend'?'AI와 대화하기':'팟게스트 되어보기';
 $('practice-title').replaceChildren();
 $('practice-title').append(document.createTextNode(mode==='friend'?'우리, 편하게':''+'오늘의 게스트는'));
 $('practice-title').append(document.createElement('br'));
 const span=document.createElement('span'); span.textContent=mode==='friend'?'이야기해 볼까요?':'당신이에요.'; $('practice-title').append(span);
 $('practice-intro').textContent=mode==='friend'?'내 이야기를 아는 친구와, 한 문장씩 천천히.':'천천히, 내 속도로. 몇 번을 다시 해도 괜찮아요.';
 $('paper-label').textContent=mode==='friend'?'이렇게 답해볼까요?':'내 이야기';
 $('practice-disclaimer').textContent=mode==='friend'?'예시 대본에 맞춰 반응하는 체험이에요.':'녹음을 마치면 이 브라우저의 팟게스트 일기장에 자동 저장돼요.';
 const question=conversationComplete?conversationEndings[selected]:data.turns[turn];
 $('question-en').textContent=question[0]; $('question-ko').textContent=question[1];
 fillLines($('practice-script'),mode==='friend'?[data.lines[data.turns[turn][2]]]:data.lines);
 $('next-question').textContent=conversationComplete || turn===data.turns.length-1?'다시 대화하기 ↺':'다음 질문 →';
 $('practice-script').hidden=hidden; $('hidden-script').hidden=!hidden;
 if(mode==='podcast' && recorder?.state==='recording'){if(hidden)stopReadingFollow();else startReadingFollow();}
 $('toggle-script').textContent=hidden?'대본 다시 보기':mode==='friend'?'대본 가리기':'가리며 말하기'; $('toggle-script').setAttribute('aria-pressed',String(hidden));
 $('practice-status').textContent=mode==='podcast'?'대본을 가리고 스튜디오 마이크를 눌러보세요. 다시 누르면 녹음을 마치고 일기장에 저장해요.':conversationRunning?'말을 마친 뒤 잠깐 기다리면 다음 질문으로 이어져요.':'시작을 누르고 이야기해 주세요. 다 말하면 다음 질문으로 이어져요.';
 updateRecordingUI();
}
document.querySelectorAll('[data-example]').forEach(button => button.addEventListener('click', () => { selected=button.dataset.example; $('story').value=examples[selected].story; count(); showWriting(); notice(); }));
$('story').addEventListener('input',()=>{ count(); notice(); });
$('make-script').addEventListener('click',()=>{
 const story=$('story').value.trim(); if(!story){ notice('오늘의 이야기를 적거나, 아래 예시 하나를 골라주세요.'); $('story').focus(); return; }
 selected=Object.keys(examples).find(key=>examples[key].story===story);

 $('story-summary').textContent=story; showStep(1);
});
$('edit-story').onclick=()=>showStep(0);
document.querySelectorAll('button[data-mode]').forEach(button=>button.onclick=()=>{ if(!selected){notice('내 이야기를 입력했어요. 아직 자유 입력의 영어 변환은 연결 전이라, ‘이야기 바꾸기’에서 예시를 선택하면 연습을 체험할 수 있어요.');return;} mode=button.dataset.mode; turn=0; hidden=false;conversationComplete=false; resetAudio(); showStep(2); renderPractice(); if(mode==='friend')chooseOrbForm(); });
$('back-script').onclick=()=>showStep(1);
$('toggle-script').onclick=()=>{hidden=!hidden;renderPractice();};
$('hear-question').onclick=()=>{cancelConversationResponse();speak($('question-en').textContent);};
$('listen-practice').onclick=()=>speak(mode==='friend'?examples[selected].lines[examples[selected].turns[turn][2]][0]:examples[selected].lines.map(l=>l[0]).join(' '));
$('next-question').onclick=skipConversationTurn;
$('restart').onclick=()=>{ cancelRecordingSession(); stopSpeech(); resetAudio(); turn=0;conversationComplete=false;hidden=false;renderPractice(); notice('괜찮아요. 처음부터 천천히 다시 해봐요.'); };
async function startRecording({session=false}={}) {
 const sessionEpoch=conversationEpoch;
 if(recordPending) return false;
 if(recorder?.state==='recording') return true;
 if(!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder){
  const message='이 미리보기에서는 마이크를 사용할 수 없어요. 마이크 사용이 허용된 브라우저 화면에서 다시 시도해 주세요.';
  $('hidden-title').textContent='마이크를 연결할 수 없어요.';$('hidden-help').textContent=message;$('practice-status').textContent=message;notice(message);return false;
 }
 if(document.permissionsPolicy?.allowsFeature && !document.permissionsPolicy.allowsFeature('microphone')){
  const message='이 미리보기 화면이 마이크 접근을 제한하고 있어요. 마이크 사용이 허용된 브라우저 화면에서 열어주세요.';
  $('hidden-title').textContent='미리보기에서 마이크가 제한돼요.';$('hidden-help').textContent=message;$('practice-status').textContent=message;notice(message);return false;
 }
 cancelConversationResponse();stopSpeech();
 const epoch=++recordingEpoch; recordPending=true; updateRecordingUI();
 $('practice-status').textContent='마이크 연결 중이에요. 브라우저에서 허용을 누르면 녹음이 시작돼요.';
 let localStream;
 try {
  localStream=session?conversationStream:await navigator.mediaDevices.getUserMedia({audio:true});
  if(!localStream || (session && (!conversationRunning || sessionEpoch!==conversationEpoch)))return false;
  if(epoch!==recordingEpoch){if(!session)localStream.getTracks().forEach(t=>t.stop());return false;}
  const localRecorder=new MediaRecorder(localStream); const localChunks=[];
  localRecorder.ondataavailable=e=>{if(e.data.size)localChunks.push(e.data);};
  const takeStarted=Date.now();
  const takeStory=!session?examples[selected]?.story:null;
  const takeLines=!session?examples[selected]?.lines.map(line=>[...line]):null;
  localRecorder.onstop=()=>{
   if(!session)localStream.getTracks().forEach(t=>t.stop());
   if(!session && localChunks.length){
    const takeBlob=new Blob(localChunks,{type:localRecorder.mimeType});
    savePodcastTake(takeBlob,takeStarted,Math.max(0,(Date.now()-takeStarted)/1000),takeStory,takeLines);
   }
   if(epoch!==recordingEpoch)return;
   if(!session)stopReadingFollow();
   stopMicMeter();
   clearInterval(recordTimer);clearTimeout(timeout);
   if(!localChunks.length){notice('녹음된 소리가 없어요. 마이크를 확인한 뒤 다시 시도해 주세요.');updateRecordingUI();updateAmbience();return;}
   const blob=new Blob(localChunks,{type:localRecorder.mimeType});
   const elapsed=Math.floor((Date.now()-recordingStarted)/1000);
   resetAudio(); $('recording-clock').textContent=`${String(Math.floor(elapsed/60)).padStart(2,'0')}:${String(elapsed%60).padStart(2,'0')}`; audioURL=URL.createObjectURL(blob);
   const audio=document.createElement('audio');audio.controls=true;audio.src=audioURL;
   const play=document.createElement('button');play.className='play-recording';play.textContent='▷ 내 목소리 들어보기';
   play.onclick=async()=>{try{if(conversationRunning)endConversation(null);cancelConversationResponse();stopSpeech();await audio.play();}catch{notice('재생 버튼을 다시 눌러주세요.');}};
   audio.onplay=()=>{if(conversationRunning)endConversation(null);cancelConversationResponse();stopSpeech();playbackActive=true;play.textContent='내 이야기를 듣고 있어요';updateAmbience();};
   const endPlayback=()=>{playbackActive=false;play.textContent='▷ 내 목소리 다시 듣기';updateAmbience();};
   audio.onpause=endPlayback;audio.onended=endPlayback;
   const link=document.createElement('a');link.href=audioURL;link.download=`my-podguest-${Date.now()}.${blob.type.includes('mp4')?'m4a':'webm'}`;link.textContent='내 목소리 다운로드 ↓';
   $('recording-result').replaceChildren(play,audio,link);
   $('practice-status').textContent=session && !conversationRunning?'대화를 멈췄어요. 내 답변을 듣거나 시작을 눌러 이어가세요.':'내 이야기를 영어로 말했어요. 내 목소리를 들어볼까요?';
   updateRecordingUI();updateAmbience();
   if(session && conversationRunning && sessionEpoch===conversationEpoch && turnDetector.hasSpeech)queueConversationResponse();
  };
  localRecorder.onerror=()=>{if(epoch===recordingEpoch){if(session)endConversation('마이크를 확인하고 다시 시작해 주세요.');else stopRecording();notice('녹음이 중단됐어요. 마이크를 확인하고 다시 시도해 주세요.');}};
  stream=localStream;recorder=localRecorder;localRecorder.start();resetAudio();turnDetector.reset(performance.now());
  const meterReady=startMicMeter(localStream);
  if(session && !meterReady){endConversation('음성 감지를 시작하지 못했어요. 마이크를 확인해 주세요.');return false;}
  if(!session)startReadingFollow();
  recordingStarted=Date.now();
  recordTimer=setInterval(()=>{const sec=Math.floor((Date.now()-recordingStarted)/1000);$('recording-clock').textContent=`${String(Math.floor(sec/60)).padStart(2,'0')}:${String(sec%60).padStart(2,'0')}`;$('visible-clock').textContent=$('recording-clock').textContent;},250);
  timeout=setTimeout(()=>session?endConversation('대화를 잠시 마쳤어요. 시작을 눌러 이어가세요.'):stopRecording(),180000);
  $('practice-status').textContent=session?'듣고 있어요. 다 말하고 잠깐 기다리면 다음 질문으로 이어져요.':'녹음 중이에요. 편하게 이야기해 주세요. (최대 3분)';notice();updateAmbience();return true;
 }catch(error){
  if(!session)localStream?.getTracks().forEach(t=>t.stop());
  if(epoch===recordingEpoch){
   const message=error.name==='NotFoundError'?'연결된 마이크가 없어요. 마이크를 연결한 뒤 시작하기 또는 마이크를 눌러주세요.':error.name==='NotAllowedError'||error.name==='SecurityError'?'마이크 권한이 필요해요. 브라우저에서 허용한 뒤 시작하기 또는 마이크를 눌러주세요.':'마이크를 사용할 수 없어요. 다른 앱이 마이크를 사용 중인지 확인하고 다시 시도해 주세요.';
   $('practice-status').textContent=message;notice(message);
  }return false;
 }
 finally{if(epoch===recordingEpoch){recordPending=false;updateRecordingUI();if(recorder?.state!=='recording' && hidden){$('hidden-title').textContent='마이크 연결을 확인해 주세요.';$('hidden-help').textContent='마이크 권한을 확인하고 마이크를 다시 눌러주세요. 미리보기에서 권한을 제한할 수도 있어요.';}}}
}
$('record').onclick=()=>{if(mode==='friend'){if(!conversationRunning)startConversation();}else if(recorder?.state==='recording')stopRecording();else startRecording();};
function loadVoices() {
 const current=$('friend-voice').value;
 const profiles=VOICE_CATALOG.filter(v=>v.gender===friendPerson);
 $('friend-voice').replaceChildren();
 profiles.forEach(profile=>{
  const available=cloudVoicesReady || Boolean(matchingLocalVoice(profile));
  const option=new Option(profile.name+(voicePlaybackFailures.has(profile.id)?' · 재생 확인 필요':available?'':' · 연결 필요'),profile.id);
  option.dataset.available=String(available);$('friend-voice').append(option);
 });
 const options=[...$('friend-voice').options];
 const chosen=options.find(o=>o.value===current)||options.find(o=>o.dataset.available==='true')||options[0];
 $('friend-voice').value=chosen?.value||'';
 $('friend-voice').disabled=conversationRunning;
 $('preview-voice').disabled=conversationRunning || chosen?.dataset.available!=='true';
 $('voice-help').textContent=cloudVoicesReady?`목소리 ${profiles.length}개 중 골라주세요.`:options.some(o=>o.dataset.available==='true')?'이 기기에서 확인된 목소리만 들어볼 수 있어요.':`목소리 ${profiles.length}개를 준비했어요. 재생하려면 전용 음성 서비스 연결이 필요해요.`;
}
loadVoices();if('speechSynthesis' in window)speechSynthesis.addEventListener('voiceschanged',loadVoices);
if(location.protocol==='http:' || location.protocol==='https:') {
 fetch('/api/voice-status').then(r=>r.ok?r.json():null).then(status=>{cloudVoicesReady=status?.configured===true;loadVoices();}).catch(()=>{});
}
$('friend-voice').onchange=()=>{cancelConversationResponse();stopSpeech();loadVoices();};
$('preview-voice').onclick=()=>{cancelConversationResponse();stopSpeech();speak('How was your day?');};
document.querySelectorAll('[data-person]').forEach(button=>{
 if(button.tagName!=='BUTTON')return;
 button.onclick=()=>{
  cancelConversationResponse();stopSpeech();friendPerson=button.dataset.person;
  $('friend-portrait').dataset.person=friendPerson;
  loadVoices();
  $('question-avatar').textContent=friendPerson==='female'?'J':'A';
  document.querySelectorAll('button[data-person]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.person===friendPerson)));
 };
});
$('voice-tab').onclick=()=>{
 const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;
 if(!Recognition){showWriting(true);$('voice-status').textContent='이 브라우저에서는 글로 이야기를 남길 수 있어요.';notice('음성 입력은 Chrome 또는 Edge에서 사용할 수 있어요. 지금은 글로 적거나 예시를 선택해 주세요.');return;}
 if(voiceActive){recognition.stop();return;}
 stopSpeech();continueAfterVoice=true;
 recognition=new Recognition(); recognition.lang='ko-KR';recognition.continuous=true;recognition.interimResults=true;
 const previous=$('story').value.trim();let captured='',heard=false;
 recognition.onstart=()=>{voiceActive=true;updateAmbience();showWriting();$('voice-tab').classList.add('selected');$('voice-tab').setAttribute('aria-pressed','true');$('voice-tab').querySelector('span').textContent='이야기 마치기';$('voice-status').textContent='듣고 있어요. 다 말했으면 마이크를 다시 눌러주세요.';notice();};
 recognition.onresult=event=>{
  let interim='';
  for(let i=event.resultIndex;i<event.results.length;i++){
   const text=event.results[i][0].transcript;
   if(text.trim())heard=true;
   if(event.results[i].isFinal)captured+=' '+text;else interim+=' '+text;
  }
  $('story').value=(previous+' '+captured+' '+interim).trim().slice(0,2000);count();
 };
 recognition.onend=()=>{
  voiceActive=false;updateAmbience();$('voice-tab').classList.remove('selected');$('voice-tab').setAttribute('aria-pressed','false');$('voice-tab').querySelector('span').textContent='눌러서 이야기하기';
  $('voice-status').textContent=heard?'이야기를 담았어요.':'편하게 다시 이야기해 주세요.';
  const advance=continueAfterVoice && heard && !$('input-panel').hidden && $('story').value.trim();
  continueAfterVoice=false;if(advance)$('make-script').click();
 };
 recognition.onerror=()=>{continueAfterVoice=false;$('voice-status').textContent='마이크를 확인하거나 글로 남겨주세요.';notice('마이크를 사용할 수 없어요. 브라우저의 마이크 권한을 확인해 주세요.');};
 try{recognition.start();}catch{continueAfterVoice=false;showWriting(true);notice('음성 입력을 시작하지 못했어요. 글로 남기거나 다시 시도해 주세요.');}
};
$('write-tab').onclick=()=>{continueAfterVoice=false;recognition?.stop();showWriting(true);};
$('sound').onclick=async()=>{
 const music=$('cafe-music'),version=++musicVersion;musicRequested=!musicRequested;
 if(!musicRequested){soundEnabled=false;music.pause();updateAmbience();return;}
 updateAmbience();
 try{await music.play();if(version!==musicVersion){if(!musicRequested)music.pause();return;}soundEnabled=true;updateAmbience();}
 catch{if(version!==musicVersion)return;musicRequested=false;soundEnabled=false;updateAmbience();notice('음악을 시작하지 못했어요. 음악 버튼을 다시 눌러주세요.');}
};
$('cafe-music').onerror=()=>{musicVersion++;musicRequested=false;soundEnabled=false;updateAmbience();notice('음원을 불러오지 못했어요. 화면을 다시 열어주세요.');};
document.addEventListener('visibilitychange',()=>{if(document.hidden && conversationRunning)endConversation('화면을 떠나 대화를 멈췄어요. 시작을 눌러 이어가세요.');});
window.addEventListener('beforeunload',()=>{$('cafe-music').pause();cancelRecordingSession();stopSpeech();recognition?.stop();if(audioURL)URL.revokeObjectURL(audioURL);audioContext?.close();});

$('studio-record').onclick=()=>{if(recorder?.state==='recording')stopRecording();else startRecording();};
const diaryStore=new PodcastDiaryStore();
const unsavedTakes=new Map();
let diaryURLs=[],diaryReturn=0,diaryVersion=0;
function pauseDiary(){
 $('diary-list').querySelectorAll('audio').forEach(audio=>audio.pause());
 diaryURLs.forEach(url=>URL.revokeObjectURL(url));diaryURLs=[];
}
async function savePodcastTake(blob,createdAt,seconds,story,lines){
 const entry={id:crypto.randomUUID(),createdAt,seconds,story,lines,blob,title:`${new Date(createdAt).toLocaleDateString('ko-KR')} 나의 이야기`};
 try{await diaryStore.put(entry);notice('팟게스트 일기장에 저장했어요. 일기장에서 제목을 바꾸고 다시 들을 수 있어요.');}
 catch{unsavedTakes.set(entry.id,entry);notice('브라우저에 저장하지 못했어요. 일기장에서 녹음을 내려받아 주세요. 이 창을 닫으면 미저장 녹음은 사라져요.');}
 if(document.body.dataset.screen==='diary')renderDiary();
}
document.querySelectorAll('.diary-open').forEach(button=>button.onclick=()=>{
 diaryReturn=['input','choice','practice'].indexOf(document.body.dataset.screen);
 showStep(3);renderDiary();
});
$('diary-back').onclick=()=>{diaryVersion++;showStep(Math.max(0,diaryReturn));if(diaryReturn===2)renderPractice();};
async function renderDiary(){
 const version=++diaryVersion;
 let entries=[],failed=false;
 try{entries=await diaryStore.list();}catch{failed=true;}
 if(version!==diaryVersion || document.body.dataset.screen!=='diary')return;
 pauseDiary();
 const byId=new Map(entries.map(entry=>[entry.id,entry]));unsavedTakes.forEach((entry,id)=>byId.set(id,entry));
 entries=[...byId.values()].sort((a,b)=>b.createdAt-a.createdAt);
 const days=new Set(entries.map(entry=>new Date(entry.createdAt).toLocaleDateString('ko-KR'))).size;
 const seconds=Math.round(entries.reduce((sum,entry)=>sum+entry.seconds,0));
 $('diary-summary').textContent=entries.length?`${entries.length}개의 이야기 · ${days}일의 기록 · ${Math.floor(seconds/60)}분 ${seconds%60}초 말했어요. 오래된 녹음과 오늘의 목소리를 비교해 보세요.`:'아직 첫 이야기를 기다리고 있어요. 스튜디오 마이크로 오늘의 목소리를 남겨보세요.';
 if(failed)$('diary-summary').textContent+=' 브라우저 저장소를 열지 못했어요. 저장된 기록을 불러오지 못할 수 있어요.';
 $('diary-list').replaceChildren();
 for(const entry of entries){
  const card=document.createElement('article');card.className='diary-entry';
  const date=document.createElement('small');date.textContent=new Date(entry.createdAt).toLocaleString('ko-KR')+` · ${Math.floor(entry.seconds/60)}분 ${Math.round(entry.seconds%60)}초`;
  const label=document.createElement('label');label.textContent='이야기 제목';label.htmlFor=`title-${entry.id}`;
  const input=document.createElement('input');input.id=label.htmlFor;input.value=entry.title;input.maxLength=80;
  const save=document.createElement('button');save.className='text-button';save.textContent='제목 저장';
  const state=document.createElement('span');state.className='save-state';state.setAttribute('role','status');state.textContent=unsavedTakes.has(entry.id)?'미저장 녹음 · 꼭 내려받아 주세요.':'일기장에 저장됨';
  save.onclick=async()=>{
   const title=input.value.trim();if(!title){state.textContent='제목을 입력해 주세요.';return;}
   save.disabled=true;const renamed={...entry,title};
   try{await diaryStore.put(renamed);Object.assign(entry,renamed);unsavedTakes.delete(entry.id);state.textContent='제목을 저장했어요.';}
   catch{if(unsavedTakes.has(entry.id)){Object.assign(entry,renamed);unsavedTakes.set(entry.id,entry);}state.textContent='저장하지 못했어요. 녹음을 내려받아 주세요.';}
   finally{save.disabled=false;}
  };
  const url=URL.createObjectURL(entry.blob);diaryURLs.push(url);
  const audio=document.createElement('audio');audio.controls=true;audio.preload='none';audio.src=url;audio.setAttribute('aria-label',`${entry.title} 녹음 듣기`);
  audio.onplay=()=>{$('diary-list').querySelectorAll('audio').forEach(other=>{if(other!==audio)other.pause();});stopSpeech();playbackActive=true;updateAmbience();};
  const ended=()=>{playbackActive=!![...$('diary-list').querySelectorAll('audio')].find(other=>!other.paused);updateAmbience();};audio.onpause=ended;audio.onended=ended;
  const download=document.createElement('a');download.href=url;download.textContent='녹음 내려받기 ↓';download.download=`${entry.title}.${entry.blob.type.includes('mp4')?'m4a':'webm'}`;
  download.onclick=()=>{download.download=`${input.value.trim()||entry.title}.${entry.blob.type.includes('mp4')?'m4a':'webm'}`;};
  const details=document.createElement('details');const summary=document.createElement('summary');summary.textContent='그날의 대본 보기';details.append(summary);
  const story=document.createElement('p');story.textContent=entry.story||'';details.append(story);const script=document.createElement('div');fillLines(script,entry.lines||[]);details.append(script);
  card.append(date,label,input,save,state,audio,download,details);$('diary-list').append(card);
 }
}

function stopReadingFollow(){
 readingVersion++;const old=readingRecognition;readingRecognition=null;
 if(old){old.onend=null;old.onresult=null;old.onerror=null;try{old.abort();}catch{}}
 document.querySelectorAll('#practice-script .script-line').forEach(line=>{line.classList.remove('reading-current','reading-done');line.removeAttribute('aria-current');});
 $('reading-status').hidden=true;
}
function startReadingFollow(){
 stopReadingFollow();if(hidden || mode!=='podcast')return;
 const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;
 $('reading-status').hidden=false;
 if(!Recognition){$('reading-status').textContent='녹음은 진행돼요. 이 브라우저는 읽는 위치의 음성 인식을 지원하지 않아요.';return;}
 const version=readingVersion, reader=new Recognition();readingRecognition=reader;
 reader.lang='en-US';reader.continuous=true;reader.interimResults=true;
 $('reading-status').textContent='영어를 읽으면 해당 문장을 따라가요.';
 const words=text=>text.toLowerCase().replace(/[^a-z0-9\s']/g,' ').replace(/'/g,'').split(/\s+/).filter(Boolean);
 let previous=-1;
 reader.onresult=event=>{
  if(version!==readingVersion || hidden || recorder?.state!=='recording')return;
  const spoken=words(Array.from(event.results,result=>result[0].transcript).join(' '));
  const lines=[...$('practice-script').querySelectorAll('.script-line')];
  // Match recognized words in script order; elapsed recording time never advances text.
  let cursor=0,current=-1;
  for(let i=0;i<lines.length;i++){
   const expected=words(lines[i].querySelector('p').textContent);let found=0,last=cursor;
   for(const word of expected){const index=spoken.indexOf(word,last);if(index>=0){found++;last=index+1;}}
   if(found>=Math.min(2,expected.length) && found/expected.length>=.5){current=i;cursor=last;}else break;
  }
  if(current<0 || current<previous)return;
  lines.forEach((line,index)=>{line.classList.toggle('reading-current',index===current);line.classList.toggle('reading-done',index<current);if(index===current)line.setAttribute('aria-current','true');else line.removeAttribute('aria-current');});
  if(current!==previous){previous=current;lines[current].scrollIntoView({block:'nearest',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});}
  $('reading-status').textContent=`${current+1} / ${lines.length}번째 문장을 듣고 있어요.`;
 };
 reader.onerror=()=>{if(version===readingVersion)$('reading-status').textContent='녹음은 계속돼요. 음성 인식 연결을 확인하지 못해 대본 따라가기는 쉬고 있어요.';};
 reader.onend=()=>{if(version===readingVersion && recorder?.state==='recording')$('reading-status').textContent='녹음은 계속돼요. 대본 따라가기 음성 인식이 종료됐어요.';};
 try{reader.start();}catch{$('reading-status').textContent='녹음은 계속돼요. 이 화면에서는 대본 따라가기를 시작하지 못했어요.';}
}
