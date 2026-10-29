const $ = (id) => document.getElementById(id);
const examples = {
 coffee: { story: '오늘 애들 보내고 혼자 카페에 가서 커피를 마셨어. 잠깐이지만 조용히 나만의 시간을 보내니까 너무 좋더라. 딱 10분이었는데 정말 필요한 시간이었어.', lines: [['I had some coffee alone today.', '오늘 혼자 커피를 마셨어요.'], ['It was quiet. And I loved it.', '조용했어요. 그게 참 좋았어요.'], ['Just ten minutes for myself.', '딱 10분, 나만의 시간.'], ['I really needed that.', '정말 필요한 시간이었어요.']], turns: [['What did you do this morning?', '오늘 아침에 뭐 했어?', 0], ['Oh, nice. How was it?', '오, 좋네. 어땠어?', 1], ['Mm, that sounds lovely. Was it a short break?', '음, 참 좋았겠다. 잠깐 쉬었던 거야?', 2], ['I get that. Did it help you feel better?', '그 마음 알 것 같아. 기분이 좀 나아졌어?', 3]] },
 work: { story: '오늘 회사에서 일이 많아서 조금 지쳤어. 집에 와서 좋아하는 음악을 들으며 쉬었어. 내일은 조금 더 괜찮은 하루였으면 좋겠어.', lines: [['I had a long day at work.', '오늘 회사에서 긴 하루를 보냈어요.'], ['I felt a little tired.', '조금 지쳤어요.'], ['So I listened to my favorite music at home.', '그래서 집에서 좋아하는 음악을 들었어요.'], ['I hope tomorrow is a better day.', '내일은 더 좋은 하루이길 바라요.']], turns: [['How was your day at work?', '오늘 회사에서 어땠어?', 0], ['Oh... a long day. How did you feel?', '아… 긴 하루였구나. 기분이 어땠어?', 1], ['Mm, I hear you. What did you do after work?', '음, 그랬구나. 퇴근하고는 뭐 했어?', 2], ['That sounds nice. How about tomorrow?', '음악으로 쉬었다니 좋네. 내일은 어떨 것 같아?', 3]] },
 walk: { story: '오늘 저녁에 동네를 산책했어. 바람이 시원하고 하늘이 참 예뻤어. 별일 없는 하루였지만 걷고 나니까 기분이 좋아졌어.', lines: [['I went for a walk this evening.', '오늘 저녁에 산책했어요.'], ['The air was cool. The sky was beautiful.', '바람은 시원했고 하늘은 참 예뻤어요.'], ['It was just a simple day.', '그냥 평범한 하루였어요.'], ['But that little walk made me happy.', '하지만 그 짧은 산책 덕분에 행복했어요.']], turns: [['What did you do this evening?', '오늘 저녁에 뭐 했어?', 0], ['Oh, a walk! What was it like outside?', '오, 산책했구나! 밖은 어땠어?', 1], ['Sounds lovely. Was it a special day?', '참 좋았겠다. 특별한 하루였어?', 2], ['Mm, I see. How did the walk make you feel?', '음, 그랬구나. 산책하고 나니 기분이 어땠어?', 3]] }
};
let chosenLevel=1,activeExampleKey=null,personalStory=null,storyRequest=null,storyGenerationEpoch=0;
let selected = null, mode = 'podcast', turn = 0, hidden = false, conversationComplete = false;
let recorder = null, stream = null, audioURL = null, timeout = null;
let latestPracticeTake=null,takeGeneration=0,savingTake=false;
let recordTimer = null, recordingStarted = 0, recordingEpoch = 0, recordPending = false, recordingFinalizing = false, playbackActive = false;
let friendPerson = "female", cloudVoicesReady = true, speechAudio = null, speechAudioURL = null, speechRequest = null;
let readingPractice=false, readingStream=null, readingEpoch=0;
let recognition = null, voiceActive = false, listening = false, continueAfterVoice = false;
let audioContext = null, soundEnabled = false, musicRequested = false, musicVersion = 0;
let cafeTrackIndex=0,musicSwitching=false;
let speechActive = false, speechGeneration = 0, activeUtterance = null;
let speechStartTimer = null, speechEndTimer = null, speechQueueTimer = null;
const commonSpeechPlayer=new Audio(),ownVoicePlayer=new Audio();
let ownVoiceUnlocked=false;
const speechCache=new Map();let speechCacheBytes=0,commonSpeechUnlocked=false;
const speechUnlockSource='data:audio/wav;base64,UklGRkQDAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YSADAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==';
function unlockCommonSpeech(){
 if(commonSpeechUnlocked)return;
 commonSpeechPlayer.src=speechUnlockSource;
 // Reuse this player after the request, including subsequent automatic questions.
 try{commonSpeechPlayer.play().then(()=>{commonSpeechUnlocked=true;}).catch(()=>{});}catch{}
}
function unlockOwnVoicePlayback(){
 ownVoicePlayer.pause();
 if(ownVoiceUnlocked)return;
 ownVoicePlayer.onplay=null;ownVoicePlayer.onpause=null;ownVoicePlayer.onended=null;
 ownVoicePlayer.src=speechUnlockSource;
 try{ownVoicePlayer.play().then(()=>{ownVoiceUnlocked=true;}).catch(()=>{});}catch{}
}
function cacheSpeech(key,blob){
 while(speechCache.size && (speechCache.size>=16 || speechCacheBytes+blob.size>10000000)){
  const oldest=speechCache.keys().next().value;speechCacheBytes-=speechCache.get(oldest).size;speechCache.delete(oldest);
 }
 speechCache.set(key,blob);speechCacheBytes+=blob.size;
}
let responseTimer=null, responseVersion=0, conversationPending=false;
let meterFrame=null, meterSource=null, meterAnalyser=null;
let resumeAfterRecording=false;
let conversationPaused=false,conversationStage='question',pausedConversationStage='question';
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
 const labels={ready:'대기',listening:'음성 감지',thinking:'준비 중',speaking:'AI 음성 재생',connecting:'마이크 연결',reviewing:'내 목소리 재생'};
 scene.dataset.state=state;
 if($('friend-presence').textContent!==labels[state])$('friend-presence').textContent=labels[state];
 $('orb-field').setAttribute('aria-label',`${$('orb-form-name').textContent}. ${labels[state]}`);
}
function stopMicMeter() {
 if(meterFrame!==null)cancelAnimationFrame(meterFrame);meterFrame=null;
 meterSource?.disconnect();meterAnalyser?.disconnect();meterSource=null;meterAnalyser=null;
 $('friend-portrait').style.setProperty('--level','0');$('record').style.setProperty('--mic-level','0');
 $('studio-record').style.setProperty('--mic-level','0');$('large-studio-record').style.setProperty('--mic-level','0');
 $('mic-level-fill').style.width='0%';
 $('live-voice').classList.remove('voice-detected');
 document.querySelectorAll('.voice-wave i').forEach(bar=>bar.style.setProperty('--voice-height','.08'));
}
async function prepareMicMeter(){
 const Audio=window.AudioContext||window.webkitAudioContext;
 if(!Audio)return false;
 audioContext??=new Audio();
 // Unlock audio analysis from the button gesture before waiting for microphone permission.
 if(audioContext.state==='suspended')await audioContext.resume();
 return audioContext.state==='running';
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
   const isListening=readingPractice || recorder?.state==='recording';
   voiceBars.forEach((bar,index)=>{const start=index*Math.floor(samples.length/voiceBars.length),end=start+Math.floor(samples.length/voiceBars.length);let energy=0;for(let j=start;j<end;j++)energy+=samples[j]*samples[j];bar.style.setProperty('--voice-height',String(isListening?Math.max(.08,Math.min(1,Math.sqrt(energy/(end-start))*12)):.08));});
   if(isListening && performance.now()-lastVoiceUI>350){lastVoiceUI=performance.now();const detected=rms>.015;$('live-voice').classList.toggle('voice-detected',detected);const label=mode==='friend'?(detected?'음성 감지':'마이크 켜짐'):(detected?'목소리가 들려요':'듣고 있어요 · 편하게 말해주세요');if($('live-voice-label').textContent!==label)$('live-voice-label').textContent=label;}
   if(mode==='friend' && conversationRunning && recorder?.state==='recording' && turnDetector.observe(rms,performance.now())){stopRecording();return;}
   level=level*.65+Math.min(1,rms*8)*.35;
   $('friend-portrait').style.setProperty('--level','0');$('record').style.setProperty('--mic-level',mode==='friend' && isListening?level.toFixed(3):'0');
   $('studio-record').style.setProperty('--mic-level',level.toFixed(3));$('large-studio-record').style.setProperty('--mic-level',level.toFixed(3));
   if(mode==='podcast' && !readingPractice){const status=rms>.015?'● 목소리 감지 중 · 녹음 중':'● 마이크 연결됨 · 녹음 중';if($('mic-status').textContent!==status)$('mic-status').textContent=status;}
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
 conversationStage='next';conversationPending=true;updateOrbState();$('practice-status').textContent='';
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
function endConversation(message='') {
 resumeAfterRecording=false;conversationPaused=false;conversationRunning=false;recordPending=false;conversationEpoch++;sessionQuestionVersion++;updateRecordingUI();
 clearTimeout(sessionListenTimer);clearTimeout(sessionLimitTimer);sessionListenTimer=null;sessionLimitTimer=null;
 cancelConversationResponse();stopSpeech();stopRecording();
 if(!recordingFinalizing)conversationStream?.getTracks().forEach(track=>track.stop());conversationStream=null;
 recordPending=false;updateRecordingUI();updateAmbience();
 $('practice-status').textContent=message||'';
}
function pauseConversation(){
 const stage=conversationStage;
 endConversation();
 pausedConversationStage=stage;conversationPaused=true;updateRecordingUI();
}
async function startConversation() {
 if(conversationRunning)return;
 if(recordingFinalizing){resumeAfterRecording=true;updateRecordingUI();return;}
 resumeAfterRecording=false;notice();document.querySelector('.friend-settings').open=false;
 const resume=conversationPaused,resumeStage=pausedConversationStage;
 loadVoices();
 const profile=selectedSpeechProfile()||speechProfiles()[0];
 if(!profile || !cloudVoicesReady){notice('AI 음성을 연결하지 못했어요. 다시 시도해 주세요.');return;}
 if(!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder || !(window.AudioContext||window.webkitAudioContext)){
  notice('대화는 마이크를 사용할 수 있는 Chrome 또는 Edge에서 열어주세요.');return;
 }
 cancelConversationResponse();stopSpeech();$('recording-result').querySelector('audio')?.pause();
 conversationPaused=false;conversationStage=resume && resumeStage==='answer'?'answer':'question';
 conversationRunning=true;const epoch=++conversationEpoch;recordPending=true;updateRecordingUI();updateAmbience();
 $('practice-status').textContent='';
 let mic;
 try {
  if(conversationComplete && !resume){turn=0;conversationComplete=false;hidden=false;resetAudio();renderPractice();}
  if(resume && resumeStage==='next'){if(turn<examples[selected].turns.length-1)turn++;else conversationComplete=true;hidden=false;renderPractice();}
  const resumeAnswer=resume && resumeStage==='answer';
  const initialSpeech=resumeAnswer?null:speak($('question-en').textContent);
  const Audio=window.AudioContext||window.webkitAudioContext;audioContext??=new Audio();await audioContext.resume();
  if(epoch!==conversationEpoch || !conversationRunning)return;
  mic=await navigator.mediaDevices.getUserMedia({audio:true});
  if(epoch!==conversationEpoch || !conversationRunning){mic.getTracks().forEach(track=>track.stop());return;}
  conversationStream=mic;stream=mic;recordPending=false;
  for(const track of mic.getAudioTracks())track.addEventListener('ended',()=>{if(conversationRunning && epoch===conversationEpoch)endConversation('마이크 연결이 끊어졌어요. 연결을 확인하고 다시 시작해 주세요.');},{once:true});
  renderPractice();updateAmbience();notice();
  sessionLimitTimer=setTimeout(()=>{if(epoch===conversationEpoch)endConversation();},300000);
  if(resumeAnswer){const started=await startRecording({session:true});if(!started && epoch===conversationEpoch)endConversation('마이크를 확인하고 다시 시도해 주세요.');}
  else await playSessionQuestion(epoch,initialSpeech);
 }catch{
  mic?.getTracks().forEach(track=>track.stop());
  if(epoch===conversationEpoch){endConversation('마이크 권한을 확인한 뒤 시작을 다시 눌러주세요.');notice('마이크 사용을 허용해 주세요.');}
 }
}
async function playSessionQuestion(epoch,initialSpeech=null) {
 if(!conversationRunning || epoch!==conversationEpoch)return;
 conversationStage='question';
 const version=++sessionQuestionVersion;
 const ok=await (initialSpeech || speak($('question-en').textContent));
 if(!conversationRunning || epoch!==conversationEpoch || version!==sessionQuestionVersion)return;
 if(!ok){endConversation('음성을 재생하지 못해 대화를 멈췄어요. 목소리를 확인하고 다시 시작해 주세요.');return;}
 if(conversationComplete){endConversation();return;}
 conversationStage='answer';
 sessionListenTimer=setTimeout(async()=>{
  sessionListenTimer=null;
  if(!conversationRunning || epoch!==conversationEpoch)return;
  const started=await startRecording({session:true});
  if(!started && conversationRunning && epoch===conversationEpoch)endConversation('마이크를 확인하고 다시 시작해 주세요.');
 },350);
}
function skipConversationTurn() {
 conversationStage='question';if(conversationPaused)pausedConversationStage='question';
 sessionQuestionVersion++;cancelConversationResponse();clearTimeout(sessionListenTimer);sessionListenTimer=null;
 recordingEpoch++;stopRecording();stopSpeech();resetAudio();
 turn=(turn+1)%examples[selected].turns.length;conversationComplete=false;hidden=false;renderPractice();
 if(conversationRunning)playSessionQuestion(conversationEpoch);
}
function updateAmbience() {
 const music=$('cafe-music');music.volume=.6;music.muted=false;
 $('sound-state').textContent=soundEnabled?'ON':musicRequested?'준비 중':'OFF';
 $('sound').setAttribute('aria-pressed',String(musicRequested));
 $('sound').setAttribute('aria-label',musicRequested?'카페 음악 끄기':'카페 음악 켜기');
 $('sound').title=`${cafeTrackIndex+1}/${CAFE_TRACKS.length} ${CAFE_TRACKS[cafeTrackIndex].title} · OFF를 누를 때까지 이어 들어요.`;
 $('music-now').hidden=!musicRequested;
 $('music-now').textContent=`♫ ${cafeTrackIndex+1}/${CAFE_TRACKS.length} · ${CAFE_TRACKS[cafeTrackIndex].title}`;
 const portrait = $("friend-portrait");
 if (portrait) { portrait.classList.toggle("speaking", speechActive && mode === "friend"); updateOrbState(); }
}
const notice = (message = '') => { $('notice').textContent = message; };
function count() { $('count').textContent = `${$('story').value.length.toLocaleString()} / 2,000`; saveStoryDraft(); }
function showWriting(focus=false) {
 $('writing-area').hidden=false;document.body.dataset.writing='true';
 if(focus)$('story').focus();
}
$('home').onclick=event=>{event.preventDefault();showStep(0);$('writing-area').hidden=true;delete document.body.dataset.writing;};
function stopSpeech() {
 finishSpeech(false);speechGeneration++; clearTimeout(speechStartTimer); clearTimeout(speechEndTimer); clearTimeout(speechQueueTimer); activeUtterance=null; speechRequest?.abort(); speechRequest=null;
 if(speechAudio){speechAudio.pause();speechAudio=null;}
 if(speechAudioURL){URL.revokeObjectURL(speechAudioURL);speechAudioURL=null;}
 if ('speechSynthesis' in window) window.speechSynthesis.cancel();
 listening=false;speechActive=false;updateAmbience();
}
function speechProfiles(){return VOICE_CATALOG.filter(voice=>voice.gender===friendPerson);}
function selectedSpeechProfile(){return speechProfiles().find(voice=>voice.id===$('friend-voice').value);}
async function speak(text) {
 if(listening){stopSpeech();return false;}
 const profile=selectedSpeechProfile()||speechProfiles()[0];
 if(!profile || !cloudVoicesReady){notice('공통 AI 음성을 연결하지 못했어요. 인터넷 연결을 확인하고 새로고침해 주세요.');return false;}
 stopSpeech();
 const generation=++speechGeneration;
 const completion=new Promise(resolve=>{speechCompletion=resolve;});
 const finish=()=>{if(generation!==speechGeneration)return;clearTimeout(speechStartTimer);clearTimeout(speechEndTimer);listening=false;speechActive=false;updateAmbience();finishSpeech(true);};
 const fail=message=>{
  if(generation!==speechGeneration)return;
  stopSpeech();loadVoices();
  notice(typeof message==='string'?message:'음성을 재생하지 못했어요. 다시 듣기를 눌러주세요.');
 };
 listening=true;updateOrbState();unlockCommonSpeech();
 try {
  speechRequest=new AbortController();
  notice();speechStartTimer=setTimeout(()=>fail('음성 준비가 늦어지고 있어요. 다시 눌러주세요.'),30000);
  const key=profile.id+'\n'+text;
  let blob=speechCache.get(key);
  if(!blob){
   const response=await fetch('/api/speech',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text,voice:profile.id}),signal:speechRequest.signal});
   if(generation!==speechGeneration)return completion;
   if(!response.ok){fail(response.status===429?'AI 음성 요청이 많아요. 잠시 후 다시 눌러주세요.':'공통 AI 음성을 준비하지 못했어요. 잠시 후 다시 눌러주세요.');return completion;}
   if(!response.headers.get('content-type')?.startsWith('audio/')){fail();return completion;}
   blob=await response.blob();if(generation!==speechGeneration)return completion;
   if(!blob.size){fail();return completion;}cacheSpeech(key,blob);
  }
  if(generation!==speechGeneration)return completion;
  speechAudioURL=URL.createObjectURL(blob);speechAudio=commonSpeechPlayer;speechAudio.src=speechAudioURL;
  speechAudio.onended=finish;speechAudio.onerror=()=>fail();
  await speechAudio.play();if(generation!==speechGeneration)return completion;
  commonSpeechUnlocked=true;clearTimeout(speechStartTimer);speechActive=true;updateAmbience();notice();
  speechEndTimer=setTimeout(()=>fail('음성 재생을 잠시 마쳤어요. 다시 듣기를 눌러주세요.'),180000);
 }catch(error){if(generation===speechGeneration && error.name!=='AbortError')fail(error.name==='NotAllowedError'?'재생을 허용하려면 다시 듣기를 한 번 더 눌러주세요.':'AI 음성을 불러오지 못했어요. 연결을 확인하고 다시 눌러주세요.');}
 return completion;
}
function speakQuestion(){if(cloudVoicesReady)speak($('question-en').textContent);}
function stopRecording() {
 stopReadingPractice();
 stopReadingFollow();
 clearTimeout(timeout); clearInterval(recordTimer); recordTimer = null;stopMicMeter();
 if (recorder?.state === 'recording'){recordingFinalizing=true;recorder.stop();}
 // Release microphone tracks in onstop, after the final dataavailable event.
 if(!recordingFinalizing && (!conversationRunning || stream!==conversationStream))stream?.getTracks().forEach(t => t.stop()); updateRecordingUI(); updateAmbience();
}
function updateRecordingUI() {
 const active = recorder?.state === 'recording';
 const micActive=active || readingPractice;
 $('live-voice').hidden=!(mode==='friend' || readingPractice || active || recordPending);
 if(!active && !readingPractice)$('live-voice-label').textContent=recordPending?'마이크 연결 중…':speechActive?'친구가 이야기하고 있어요':'질문을 들은 뒤 이야기해 주세요';
 $('studio-record').hidden=mode!=='podcast' || hidden;
 $('large-studio-record').disabled=recordPending || recordingFinalizing || savingTake;
 $('large-studio-record').setAttribute('aria-pressed',String(active));
 $('large-studio-record').setAttribute('aria-label',active?'녹음 마치기':'녹음 시작');
 $('large-studio-record-label').textContent=recordPending?'마이크 연결 중…':recordingFinalizing?'녹음 마치는 중…':active?'눌러서 녹음 마치기':'마이크를 눌러 시작';
 $('large-recording-orb').classList.toggle('is-recording',active);
 $('large-recording-orb').classList.toggle('is-pending',recordPending);
 $('listen-own').hidden=mode==='friend'?(conversationRunning || resumeAfterRecording || recordingFinalizing || !$('recording-result').querySelector('audio')):false;
 $('listen-own').disabled=recordPending || recordingFinalizing || (!(mode==='friend'?$('recording-result').querySelector('audio'):latestPracticeTake) && !active);
 $('listen-own').setAttribute('aria-pressed',String(Boolean($('recording-result').querySelector('audio') && !$('recording-result').querySelector('audio').paused)));
 $('save-take').hidden=mode!=='podcast' || !hidden;
 $('save-take').disabled=recordPending || recordingFinalizing || savingTake || (!active && (!latestPracticeTake?.hidden || latestPracticeTake.saved));
 $('save-take').setAttribute('aria-label',latestPracticeTake?.saved?'일기장에 저장됨':'대본과 녹음파일 저장');
 $('listen-practice').hidden=mode==='podcast' && hidden;
 if(mode==='podcast')$('podcast-save-note').textContent=latestPracticeTake?.saved?'일기장에 저장했어요.':hidden?'마음에 들면 💾로 저장하세요.':'말한 뒤 🗣️로 들어보세요.';
 $('studio-record').disabled=recordPending || recordingFinalizing || savingTake;
 $('studio-record').setAttribute('aria-pressed',String(micActive));
 $('studio-record').setAttribute('aria-label',active?'녹음 마치기':'녹음 시작');
 $('studio-record-label').textContent=recordingFinalizing?'녹음 마치는 중…':recordPending?'마이크 연결 중…':active?'녹음 중 · 눌러서 마치기':'마이크를 눌러 시작';
 $('record').hidden=mode==='podcast';
 $('practice-label').hidden=mode==='podcast';
 $('podcast-save-note').hidden=mode!=='podcast';
 $('podcast-clock').hidden=mode!=='podcast' || hidden || !active;
 $('podcast-mic-status').textContent=mode!=='podcast'?'':recordPending?'마이크 연결 중':recordingFinalizing?'녹음 저장 중':readingPractice?'듣고 있어요':active?'녹음 중':'';
 $('recording-feedback').hidden=mode!=='podcast' || !hidden || (!active && !recordPending);
 $('visible-clock').hidden=hidden;
 if(recordPending)$('mic-status').textContent='마이크 연결 중 · 권한을 허용해 주세요';
 else if(active && mode==='podcast')$('mic-status').textContent='● 마이크 연결됨 · 녹음 중';
 $('recording-orb').classList.toggle('is-recording', micActive);
 $('recording-orb').classList.toggle('is-pending', recordPending);
 const running=mode==='friend'?(conversationRunning || resumeAfterRecording):readingPractice || active;
 const label=mode==='podcast' && !hidden?(recordPending?'마이크 연결 중…':readingPractice?'말하기 마치기':'시작하기'):mode==='friend'?(running?'멈춤':'시작'):recordPending?'마이크 연결 중…':active?'녹음 마치기':'시작하기';
 const icon=mode==='friend'?(running?'■':'●'):!hidden?'●':running?'■':'●';
 const labelElement=$('record').querySelector('.record-label');
 const iconElement=$('record').querySelector('.record-icon');
 if(labelElement.textContent!==label)labelElement.textContent=label;
 if(iconElement.textContent!==icon)iconElement.textContent=icon;
 $('record').disabled=mode==='friend'?false:recordingFinalizing || recordPending;
 $('record').classList.toggle('recording',running);
 $('record').dataset.state=running?'running':recordPending?'connecting':'ready';
 $('record').setAttribute('aria-pressed',String(running));
 $('record').setAttribute('aria-label',mode==='friend'?(running?'대화 멈춤':'대화 시작'):label);
 $('next-question').disabled=recordPending || recordingFinalizing;
 $('next-question').hidden=mode!=='friend' || (!conversationRunning && !conversationPaused);
 $('restart').disabled=conversationRunning || recordingFinalizing || savingTake;
 $('toggle-script').disabled = recordingFinalizing || savingTake;
 $('friend-toggle-script').disabled=$('toggle-script').disabled;
 $('friend-toggle-script').textContent=hidden?'대본 다시 보기':'대본 가리기';
 ['listen-practice','hear-question'].forEach(id=>$(id).disabled=conversationRunning || readingPractice || active || recordPending);
 $('preview-voice').disabled=conversationRunning || readingPractice || active || recordPending || (!cloudVoicesReady || !selectedSpeechProfile());
 $('friend-voice').disabled=conversationRunning || !selectedSpeechProfile();document.querySelectorAll('button[data-person]').forEach(button=>button.disabled=conversationRunning);
 $('hidden-title').textContent = recordPending ? '마이크 사용을 허용해 주세요.' : active ? '지금, 당신의 이야기를 담고 있어요.' : audioURL ? '내 목소리로 이야기를 완성했어요.' : '당신의 이야기를 들려주세요.';
 updateOrbState();
 $('hidden-help').textContent = recordPending ? '브라우저의 마이크 허용 창을 확인해 주세요. 허용하면 바로 녹음돼요.' : active ? '다 말했으면 마이크를 다시 눌러주세요.' : audioURL ? '아래에서 녹음한 이야기를 들어보세요.' : '막히면 언제든 대본을 다시 볼 수 있어요.';
}
function cancelRecordingSession() {
 conversationPaused=false;
 if(conversationRunning || conversationStream)endConversation(null);
 cancelConversationResponse();recordingEpoch++; stopRecording(); recordPending=false; updateRecordingUI();
} 
function showStep(step) {
 cancelStoryGeneration(); pauseDiary(); stopSpeech(); cancelRecordingSession(); $('recording-result').querySelector('audio')?.pause(); continueAfterVoice=false; if (recognition) recognition.stop(); notice();
 document.body.dataset.screen=['input','choice','practice','diary'][step];
 ['input-panel','script-panel','practice-panel','diary-panel'].forEach((id,i) => $(id).hidden = i !== step);
 document.querySelectorAll('[data-step]').forEach((el,i) => { el.classList.toggle('active', i === step); if (i === step) el.setAttribute('aria-current','step'); else el.removeAttribute('aria-current'); });
 window.scrollTo({top:0,behavior:'instant'});
}
function fillLines(container, lines) {
 container.replaceChildren();
 for (const [en,ko] of lines) { const div = document.createElement('div'); div.className='script-line'; const p=document.createElement('p'); p.textContent=en; const small=document.createElement('small'); small.textContent=ko; div.append(p,small); container.append(div); }
}
function resetAudio() { latestPracticeTake=null;const old=$('recording-result').querySelector('audio'); if(old)old.pause(); playbackActive=false; if (audioURL) URL.revokeObjectURL(audioURL); audioURL=null; $('recording-result').replaceChildren(); $('recording-clock').textContent='00:00';$('visible-clock').textContent='00:00';$('podcast-clock').textContent='00:00'; updateAmbience(); }
function renderPractice() {
 const data=examples[selected];
 document.body.dataset.mode=mode;document.body.dataset.podcastStage=hidden?'hidden':'visible';
 $('friend-question').hidden = mode !== 'friend';
 $('friend-person').hidden = mode !== 'friend';
 $('next-question').hidden = mode !== 'friend' || (!conversationRunning && !conversationPaused);
 $('practice-label').textContent=(mode==='friend'?'AI와 대화하기':'팟게스트 되어보기')+' · '+(data.level||1)+'단계';
 $('practice-title').replaceChildren();
 $('practice-title').append(document.createTextNode(mode==='friend'?'우리, 편하게':''+'오늘의 게스트는'));
 $('practice-title').append(document.createElement('br'));
 const span=document.createElement('span'); span.textContent=mode==='friend'?'이야기해 볼까요?':'당신이에요.'; $('practice-title').append(span);
 $('practice-intro').textContent=mode==='friend'?'내 이야기를 아는 친구와, 한 문장씩 천천히.':'천천히, 내 속도로. 몇 번을 다시 해도 괜찮아요.';
 $('paper-label').hidden=mode==='friend';$('paper-label').textContent=mode==='friend'?'':'내 이야기';
 const question=conversationComplete?(examples[selected].ending || conversationEndings[selected]):data.turns[turn];
 $('question-en').textContent=question[0]; $('question-ko').textContent=question[1];
 fillLines($('practice-script'),mode==='friend'?[(data.answerLines || data.lines)[data.turns[turn][2]]]:data.lines);
 $('next-question').textContent='›';
 $('practice-script').hidden=hidden; $('hidden-script').hidden=!hidden;
 $('toggle-script').textContent=hidden?'대본 다시 보기':mode==='friend'?'대본 가리기':'가리며 말하기'; $('toggle-script').setAttribute('aria-pressed',String(hidden));
 $('practice-status').textContent=mode==='podcast'?'마이크를 눌러 녹음해 주세요.':'';
 updateRecordingUI();rememberPracticeText();
}
function syncLevels(){
 document.querySelectorAll('button[data-level]').forEach(button=>button.setAttribute('aria-pressed',String(Number(button.dataset.level)===chosenLevel)));
}
function setStoryBusy(busy){
 $('make-script').disabled=busy;$('make-script').setAttribute('aria-busy',String(busy));
 $('make-script').textContent=busy?'내 이야기로 대본 만드는 중…':'내 이야기로 영어 만들기';
 $('story').readOnly=busy;$('voice-tab').disabled=busy;$('write-tab').disabled=busy;
 document.querySelectorAll('button[data-level],button[data-example]').forEach(button=>button.disabled=busy);
 $('generation-progress').hidden=!busy;
}
function cancelStoryGeneration(){
 if(!storyRequest)return;
 storyGenerationEpoch++;storyRequest.abort();storyRequest=null;setStoryBusy(false);
}
function applyStoryLevel(){
 if(activeExampleKey){
  const original=examples[activeExampleKey];
  selected=`sample-${activeExampleKey}-${chosenLevel}`;
  examples[selected]={...original,lines:EXAMPLE_UPGRADES[activeExampleKey]?.[chosenLevel]||original.lines,level:chosenLevel,isExample:true,ending:conversationEndings[activeExampleKey]};
 }else if(personalStory){
  const level=personalStory.result.levels.find(item=>item.level===chosenLevel);
  selected=`personal-${chosenLevel}`;
  examples[selected]={story:personalStory.source,title:personalStory.result.title,level:chosenLevel,isExample:false,
   lines:level.podcast.map(line=>[line.en,line.ko]),answerLines:level.dialogue.map(item=>[item.answer.en,item.answer.ko]),
   turns:level.dialogue.map((item,index)=>[item.question.en,item.question.ko,index]),ending:[level.closing.en,level.closing.ko]};
 }
 if(selected){$('story-summary').textContent=examples[selected].story;$('story-kind').textContent=activeExampleKey?'예시 이야기 · '+chosenLevel+'단계':'내 이야기 · '+chosenLevel+'단계';}
 syncLevels();
}
document.querySelectorAll('button[data-level]').forEach(button=>button.onclick=()=>{chosenLevel=Number(button.dataset.level);syncLevels();if(!$('script-panel').hidden)applyStoryLevel();});
document.querySelectorAll('[data-example]').forEach(button=>button.addEventListener('click',()=>{cancelStoryGeneration();activeExampleKey=button.dataset.example;selected=activeExampleKey;$('story').value=examples[activeExampleKey].story;count();showWriting();notice();}));
$('story').addEventListener('input',()=>{activeExampleKey=null;count();notice();});
const storyErrors={ai_auth_error:'AI 연결을 확인해야 해요. 적은 이야기는 그대로 남아 있어요. 잠시 후 다시 시도해 주세요.',ai_model_unavailable:'지금 AI 연결을 확인하고 있어요. 예시 이야기로 먼저 연습할 수 있어요.',ai_quota:'지금은 AI 사용 한도로 대본을 만들 수 없어요. 예시 이야기는 연습할 수 있어요.',ai_not_configured:'AI 연결이 아직 준비되지 않았어요. 적은 이야기는 그대로 남아 있어요. 예시 이야기는 바로 연습할 수 있어요.',too_many_requests:'짧은 시간에 여러 번 만들었어요. 잠시 쉬었다 다시 시도해 주세요.',ai_busy:'지금 AI가 바빠요. 잠시 후 다시 눌러주세요.',ai_timeout:'AI가 대본을 만드는 데 시간이 걸리고 있어요. 이야기는 남아 있으니 다시 시도해 주세요.',invalid_story:'오늘 있었던 일을 조금 더 들려주세요. 2,000자 안에서 적을 수 있어요.',generation_refused:'이 이야기로는 대본을 만들지 못했어요. 내용을 조금 바꾸어 다시 시도해 주세요.'};
$('make-script').addEventListener('click',async()=>{
 saveStoryDraft();
 const source=$('story').value.trim();
 if(!source){notice('오늘의 이야기를 적거나, 아래 예시 하나를 골라주세요.');$('story').focus();return;}
 if(storyRequest)return;
 continueAfterVoice=false;recognition?.stop();
 activeExampleKey=['coffee','work','walk'].find(key=>examples[key].story===source)||null;
 if(activeExampleKey || personalStory?.source===source){applyStoryLevel();showStep(1);return;}
 const id=++storyGenerationEpoch;const controller=new AbortController();storyRequest=controller;setStoryBusy(true);notice();
 try{
  const response=await fetch('/api/story',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({story:source}),signal:controller.signal});
  const body=await response.json().catch(()=>null);
  if(id!==storyGenerationEpoch)return;
  if(!response.ok)throw new Error(storyErrors[body?.error]||'대본을 만들지 못했어요. 이야기는 그대로 남아 있어요. 잠시 후 다시 시도해 주세요.');
  const result=normalizeStoryResult(body);
  personalStory={source,result};saveGeneratedStory();activeExampleKey=null;applyStoryLevel();
  storyRequest=null;setStoryBusy(false);showStep(1);
 }catch(error){if(id===storyGenerationEpoch && error.name!=='AbortError')notice(error.message==='invalid_story_result'?'AI 대본을 확인하지 못했어요. 다시 시도해 주세요.':error.message==='Failed to fetch'?'인터넷 연결을 확인하고 다시 시도해 주세요.':error.message);}
 finally{if(id===storyGenerationEpoch){storyRequest=null;setStoryBusy(false);}}
});
$('cancel-generation').onclick=()=>{cancelStoryGeneration();notice('작성을 취소했어요. 이야기는 그대로 남아 있어요.');};
$('edit-story').onclick=()=>showStep(0);
document.querySelectorAll('button[data-mode]').forEach(button=>button.onclick=()=>{ if(!selected || !examples[selected]){notice('먼저 내 이야기로 영어 대본을 만들어주세요.');return;} mode=button.dataset.mode; turn=0; hidden=false;conversationComplete=false; resetAudio(); showStep(2); renderPractice(); if(mode==='friend')chooseOrbForm(); });
$('back-script').onclick=()=>showStep(1);
$('toggle-script').onclick=async()=>{if(mode==='podcast'){await finishPracticeRecording();resetAudio();}hidden=!hidden;renderPractice();};
$('hear-question').onclick=()=>{cancelConversationResponse();speak($('question-en').textContent);};
$('listen-practice').onclick=()=>speak(mode==='friend'?(examples[selected].answerLines || examples[selected].lines)[examples[selected].turns[turn][2]][0]:examples[selected].lines.map(l=>l[0]).join(' '));
$('next-question').onclick=skipConversationTurn;
$('restart').onclick=()=>{takeGeneration++;cancelRecordingSession();stopSpeech();resetAudio();turn=0;conversationComplete=false;if(mode==='friend')hidden=false;renderPractice();notice();};
async function startRecording({session=false}={}) {
 if(!session && mode!=='podcast')return false;
 const sessionEpoch=conversationEpoch;
 if(recordPending || recordingFinalizing) return false;
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
 $('practice-status').textContent=session?'':'마이크 연결 중이에요. 브라우저에서 허용을 누르면 녹음이 시작돼요.';
 let localStream;
 try {
  if(!session)await prepareMicMeter().catch(()=>false);
  if(epoch!==recordingEpoch)return false;
  localStream=session?conversationStream:await navigator.mediaDevices.getUserMedia({audio:true});
  if(!localStream || (session && (!conversationRunning || sessionEpoch!==conversationEpoch)))return false;
  if(epoch!==recordingEpoch){if(!session)localStream.getTracks().forEach(t=>t.stop());return false;}
  const preferredType=['audio/webm;codecs=opus','audio/mp4'].find(type=>MediaRecorder.isTypeSupported?.(type));
  const options=preferredType?{mimeType:preferredType,audioBitsPerSecond:128000}:{};
  const localRecorder=new MediaRecorder(localStream,options); const localChunks=[];
  localRecorder.ondataavailable=e=>{if(e.data.size)localChunks.push(e.data);};
  const takeStarted=Date.now();
  const takeStory=!session?examples[selected]?.story:null;
  const takeLines=!session?examples[selected]?.lines.map(line=>[...line]):null;
  const takeTitle=!session?examples[selected]?.title:null;const takeLevel=!session?examples[selected]?.level:null;
  const takeId=crypto.randomUUID(),takeHidden=hidden,generation=!session?++takeGeneration:takeGeneration;
  localRecorder.onstop=()=>{
   recordingFinalizing=false;
   if(resumeAfterRecording && mode==='friend' && !$('practice-panel').hidden){resumeAfterRecording=false;queueMicrotask(()=>startConversation());}
   if(!session || !conversationRunning || localStream!==conversationStream)localStream.getTracks().forEach(t=>t.stop());
   updateRecordingUI();
   if(epoch!==recordingEpoch || (!session && generation!==takeGeneration))return;
   if(!session)stopReadingFollow();
   stopMicMeter();
   clearInterval(recordTimer);clearTimeout(timeout);
   if(!localChunks.length){if(!session || turnDetector.hasSpeech)notice('녹음된 소리가 없어요. 마이크를 확인한 뒤 다시 시도해 주세요.');updateRecordingUI();updateAmbience();return;}
   const blob=new Blob(localChunks,{type:localRecorder.mimeType});
   const elapsed=Math.floor((Date.now()-recordingStarted)/1000);
   resetAudio();if(!session)latestPracticeTake={id:takeId,blob,createdAt:takeStarted,seconds:Math.max(0,(Date.now()-takeStarted)/1000),story:takeStory,lines:takeLines,title:takeTitle,level:takeLevel||1,hidden:takeHidden,saved:false}; $('recording-clock').textContent=`${String(Math.floor(elapsed/60)).padStart(2,'0')}:${String(elapsed%60).padStart(2,'0')}`; audioURL=URL.createObjectURL(blob);
   const audio=ownVoicePlayer;audio.controls=true;audio.setAttribute('controlslist','nodownload noplaybackrate');audio.src=audioURL;
   const play=document.createElement('button');play.className='play-recording';play.textContent='▷ 내 목소리 들어보기';
   play.onclick=async()=>{try{if(conversationRunning)endConversation(null);cancelConversationResponse();stopSpeech();await audio.play();}catch{notice('재생 버튼을 다시 눌러주세요.');}};
   audio.onplay=()=>{if(conversationRunning)endConversation(null);cancelConversationResponse();stopSpeech();playbackActive=true;play.textContent='내 이야기를 듣고 있어요';updateRecordingUI();updateAmbience();};
   const endPlayback=()=>{playbackActive=false;play.textContent='▷ 내 목소리 다시 듣기';updateRecordingUI();updateAmbience();};
   audio.onpause=endPlayback;audio.onended=endPlayback;
   audio.controls=!session;$('recording-result').replaceChildren(...(session?[audio]:[play,audio]));
   if(!session)$('practice-status').textContent='내 이야기를 영어로 말했어요. 내 목소리를 들어볼까요?';
   updateRecordingUI();updateAmbience();
   if(session && conversationRunning && sessionEpoch===conversationEpoch && turnDetector.hasSpeech)queueConversationResponse();
  };
  localRecorder.onerror=()=>{if(epoch===recordingEpoch){if(session)endConversation('마이크를 확인하고 다시 시작해 주세요.');else stopRecording();notice('녹음이 중단됐어요. 마이크를 확인하고 다시 시도해 주세요.');}};
  stream=localStream;recorder=localRecorder;localRecorder.start(1000);resetAudio();turnDetector.reset(performance.now());
  const meterReady=startMicMeter(localStream);
  if(session && !meterReady){endConversation('음성 감지를 시작하지 못했어요. 마이크를 확인해 주세요.');return false;}
  recordingStarted=Date.now();
  recordTimer=setInterval(()=>{const sec=Math.floor((Date.now()-recordingStarted)/1000);$('recording-clock').textContent=`${String(Math.floor(sec/60)).padStart(2,'0')}:${String(sec%60).padStart(2,'0')}`;$('visible-clock').textContent=$('recording-clock').textContent;$('podcast-clock').textContent=$('recording-clock').textContent;},250);
  timeout=setTimeout(()=>session?endConversation():stopRecording(),180000);
  $('practice-status').textContent=session?'':'녹음 중이에요. 편하게 이야기해 주세요. (최대 3분)';notice();updateAmbience();return true;
 }catch(error){
  if(!session)localStream?.getTracks().forEach(t=>t.stop());
  if(epoch===recordingEpoch){
   const message=error.name==='NotFoundError'?'연결된 마이크가 없어요. 마이크를 연결한 뒤 시작하기 또는 마이크를 눌러주세요.':error.name==='NotAllowedError'||error.name==='SecurityError'?'마이크 권한이 필요해요. 브라우저에서 허용한 뒤 시작하기 또는 마이크를 눌러주세요.':'마이크를 사용할 수 없어요. 다른 앱이 마이크를 사용 중인지 확인하고 다시 시도해 주세요.';
   $('practice-status').textContent=message;notice(message);
  }return false;
 }
 finally{if(epoch===recordingEpoch){recordPending=false;updateRecordingUI();if(recorder?.state!=='recording' && hidden){$('hidden-title').textContent='마이크 연결을 확인해 주세요.';$('hidden-help').textContent='마이크 권한을 확인하고 마이크를 다시 눌러주세요. 미리보기에서 권한을 제한할 수도 있어요.';}}}
}
$('record').onclick=()=>{if(mode==='friend'){if(resumeAfterRecording){resumeAfterRecording=false;updateRecordingUI();}else if(conversationRunning)pauseConversation();else{unlockOwnVoicePlayback();startConversation();}}else $('studio-record').click();};
function loadVoices() {
 const current=$('friend-voice').value,profiles=speechProfiles();
 document.querySelector('.person-options').hidden=false;
 $('friend-voice').replaceChildren(...profiles.map(profile=>{const option=new Option(profile.name,profile.id);option.dataset.available=String(cloudVoicesReady);return option;}));
 $('friend-voice').value=profiles.some(profile=>profile.id===current)?current:profiles[0]?.id||'';
 $('friend-voice').disabled=conversationRunning;
 $('preview-voice').disabled=conversationRunning || !cloudVoicesReady;
 $('voice-help').textContent=cloudVoicesReady?'AI가 만든 목소리예요. 모든 기기에서 같은 목소리로 들려드려요.':'공통 AI 음성을 연결하지 못했어요. 인터넷 연결을 확인하고 새로고침해 주세요.';
}
loadVoices();
if(location.protocol==='http:' || location.protocol==='https:'){
 fetch('/api/voice-status').then(response=>response.ok?response.json():null).then(status=>{cloudVoicesReady=status?.configured===true;loadVoices();}).catch(()=>{cloudVoicesReady=false;loadVoices();});
}
$('friend-voice').onchange=()=>{cancelConversationResponse();stopSpeech();loadVoices();};
$('preview-voice').onclick=()=>{loadVoices();cancelConversationResponse();stopSpeech();speak('How was your day?');};
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
 try{await music.play();if(version!==musicVersion){if(!musicRequested)music.pause();return;}soundEnabled=musicRequested && !music.paused;updateAmbience();}
 catch{if(version!==musicVersion)return;musicRequested=false;soundEnabled=false;updateAmbience();notice('음악을 시작하지 못했어요. 음악 버튼을 다시 눌러주세요.');}
};
$('cafe-music').onplaying=()=>{musicSwitching=false;if(musicRequested){soundEnabled=true;updateAmbience();}};
$('cafe-music').onwaiting=()=>{soundEnabled=false;updateAmbience();};
$('cafe-music').onpause=()=>{if($('cafe-music').paused && !$('cafe-music').ended && !musicSwitching){soundEnabled=false;musicRequested=false;updateAmbience();}};
$('cafe-music').loop=false;
$('cafe-music').onended=async()=>{
 if(!musicRequested)return;
 const version=++musicVersion;musicSwitching=true;soundEnabled=false;
 cafeTrackIndex=(cafeTrackIndex+1)%CAFE_TRACKS.length;
 const music=$('cafe-music');music.src=CAFE_TRACKS[cafeTrackIndex].src;updateAmbience();
 try{await music.play();if(version!==musicVersion){if(!musicRequested)music.pause();return;}musicSwitching=false;soundEnabled=musicRequested && !music.paused;updateAmbience();}
 catch{if(version!==musicVersion)return;musicSwitching=false;musicRequested=false;soundEnabled=false;updateAmbience();notice('다음 음악을 재생하지 못했어요. 음악 버튼을 다시 눌러주세요.');}
};
$('cafe-music').onerror=()=>{musicVersion++;musicRequested=false;soundEnabled=false;updateAmbience();notice('음원을 불러오지 못했어요. 화면을 다시 열어주세요.');};
document.addEventListener('visibilitychange',()=>{if(document.hidden && readingPractice){stopReadingPractice();stopMicMeter();updateRecordingUI();updateAmbience();}if(document.hidden && conversationRunning)endConversation();});
window.addEventListener('beforeunload',()=>{cancelStoryGeneration();$('cafe-music').pause();cancelRecordingSession();stopSpeech();recognition?.stop();if(audioURL)URL.revokeObjectURL(audioURL);audioContext?.close();});

$('studio-record').onclick=$('large-studio-record').onclick=()=>{if(recorder?.state==='recording')stopRecording();else{unlockOwnVoicePlayback();startRecording();}};
const diaryStore=new PodcastDiaryStore();
const unsavedTakes=new Map();
let diaryURLs=[],diaryReturn=0,diaryVersion=0;
function pauseDiary(){
 $('diary-list').querySelectorAll('audio').forEach(audio=>audio.pause());
 diaryURLs.forEach(url=>URL.revokeObjectURL(url));diaryURLs=[];
}
async function finishPracticeRecording(){
 const current=recorder;
 if(current && (current.state==='recording' || recordingFinalizing)){
  const ended=new Promise(resolve=>current.addEventListener('stop',resolve,{once:true}));
  stopRecording();await ended;
 }
}
$('listen-own').onclick=async()=>{
 if(mode==='friend' && conversationRunning)pauseConversation();
 await finishPracticeRecording();
 const audio=$('recording-result').querySelector('audio');
 if(!audio){notice('먼저 마이크로 이야기해 주세요.');return;}
 if(!audio.paused){audio.pause();return;}
 try{stopSpeech();audio.currentTime=0;await audio.play();}catch{notice('🗣️를 다시 눌러주세요.');}
};
$('save-take').onclick=async()=>{
 if(savingTake || mode!=='podcast' || !hidden)return;
 savingTake=true;updateRecordingUI();
 try{
  await finishPracticeRecording();const take=latestPracticeTake;
  if(!take?.hidden || take.saved)return;
  const {hidden:stage,saved,...entry}=take;
  entry.title=entry.title||`${new Date(entry.createdAt).toLocaleDateString('ko-KR')} 나의 이야기`;
  await diaryStore.put(entry);take.saved=true;
  notice('대본과 녹음을 한 세트로 저장했어요.');
 }catch{notice('저장하지 못했어요. 💾를 다시 눌러주세요.');}
 finally{savingTake=false;updateRecordingUI();}
};
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
 const recordingCount=entries.filter(entry=>entry.blob instanceof Blob).length;
 const days=new Set(entries.map(entry=>new Date(entry.createdAt).toLocaleDateString('ko-KR'))).size;
 const seconds=Math.round(entries.reduce((sum,entry)=>sum+entry.seconds,0));
 $('diary-summary').textContent=entries.length?`${entries.length}개의 이야기 · 녹음 ${recordingCount}개 · ${days}일의 기록 · ${Math.floor(seconds/60)}분 ${seconds%60}초 연습했어요.`:'아직 첫 이야기를 기다리고 있어요. 스튜디오 마이크로 오늘의 목소리를 남겨보세요.';
 if(failed)$('diary-summary').textContent+=' 브라우저 저장소를 열지 못했어요. 저장된 기록을 불러오지 못할 수 있어요.';
 $('diary-list').replaceChildren();
 for(const entry of entries){
  const card=document.createElement('article');card.className='diary-entry';
  const date=document.createElement('small');date.textContent=new Date(entry.createdAt).toLocaleString('ko-KR')+` · ${Math.floor(entry.seconds/60)}분 ${Math.round(entry.seconds%60)}초`+(entry.level?' · '+entry.level+'단계':'');
  const label=document.createElement('label');label.textContent='이야기 제목';label.htmlFor=`title-${entry.id}`;
  const input=document.createElement('input');input.id=label.htmlFor;input.value=entry.title;input.maxLength=80;
  const save=document.createElement('button');save.className='text-button';save.textContent='제목 저장';
  const state=document.createElement('span');state.className='save-state';state.setAttribute('role','status');state.textContent=unsavedTakes.has(entry.id)?'미저장 녹음 · 꼭 내려받아 주세요.':'일기장에 저장됨';
  save.onclick=async()=>{
   const title=input.value.trim();if(!title){state.textContent='제목을 입력해 주세요.';return;}
   save.disabled=true;const renamed={...entry,title};
   try{await diaryStore.put(renamed);Object.assign(entry,renamed);unsavedTakes.delete(entry.id);state.textContent='제목을 저장했어요.';}
   catch{if(unsavedTakes.has(entry.id)){Object.assign(entry,renamed);unsavedTakes.set(entry.id,entry);}state.textContent=entry.blob instanceof Blob?'저장하지 못했어요. 녹음을 내려받아 주세요.':'제목을 저장하지 못했어요. 다시 시도해 주세요.';}
   finally{save.disabled=false;}
  };
  card.append(date,label,input,save,state);
  if(entry.blob instanceof Blob){
   const url=URL.createObjectURL(entry.blob);diaryURLs.push(url);
   const audio=document.createElement('audio');audio.controls=true;audio.preload='none';audio.src=url;
   audio.setAttribute('controlslist','nodownload noplaybackrate');
   audio.setAttribute('aria-label',`${entry.title} 녹음 듣기`);
   audio.onplay=()=>{$('diary-list').querySelectorAll('audio').forEach(other=>{if(other!==audio)other.pause();});stopSpeech();playbackActive=true;updateAmbience();};
   const ended=()=>{playbackActive=!![...$('diary-list').querySelectorAll('audio')].find(other=>!other.paused);updateAmbience();};audio.onpause=ended;audio.onended=ended;
   const download=document.createElement('a');download.href=url;download.textContent='녹음 내려받기 ↓';download.download=`${entry.title}.${entry.blob.type.includes('mp4')?'m4a':'webm'}`;
   download.onclick=()=>{download.download=`${input.value.trim()||entry.title}.${entry.blob.type.includes('mp4')?'m4a':'webm'}`;};
   const remove=document.createElement('button');remove.type='button';remove.className='text-button delete-recording';remove.textContent='삭제';remove.setAttribute('aria-label',`${entry.title} 녹음파일만 삭제`);
   remove.onclick=async()=>{
    remove.disabled=true;save.disabled=true;
    try{
     if(unsavedTakes.has(entry.id)){
      const preserved={...entry,blob:null,audioDeletedAt:Date.now()};
      // An unsaved recording can still be removed when browser storage is unavailable.
      try{await diaryStore.put(preserved);unsavedTakes.delete(entry.id);}catch{unsavedTakes.set(entry.id,preserved);}
     }else await diaryStore.removeAudio(entry.id);
     audio.pause();audio.removeAttribute('src');audio.load();URL.revokeObjectURL(url);if(latestPracticeTake?.id===entry.id)resetAudio();
     notice('녹음파일을 삭제했어요. 이야기와 대본은 그대로 남아 있어요.');
     await renderDiary();
    }catch{state.textContent='녹음파일을 삭제하지 못했어요. 다시 눌러주세요.';}
    finally{remove.disabled=false;save.disabled=false;}
   };
   const actions=document.createElement('div');actions.className='recording-actions';actions.append(download,remove);
   card.append(audio,actions);
  }else{
   const removed=document.createElement('p');removed.className='demo-note';removed.textContent='녹음파일을 삭제했어요. 이야기와 대본은 다시 볼 수 있어요.';card.append(removed);
   state.textContent=unsavedTakes.has(entry.id)?'대본 미저장 · 이 창을 닫으면 사라져요.':'대본이 저장되어 있어요.';
  }
  const details=document.createElement('details');const summary=document.createElement('summary');summary.textContent='그날의 대본 보기';details.append(summary);
  const story=document.createElement('p');story.textContent=entry.story||'';details.append(story);const script=document.createElement('div');fillLines(script,entry.lines||[]);details.append(script);
  card.append(details);$('diary-list').append(card);
 }
}

function stopReadingFollow(){ $('reading-status').hidden=true; }
function stopReadingPractice(){
 readingEpoch++;readingPractice=false;readingStream?.getTracks().forEach(track=>track.stop());readingStream=null;
 stopReadingFollow();
}
async function startReadingPractice(){
 if(readingPractice || recordPending)return;
 if(!navigator.mediaDevices?.getUserMedia){notice('이 화면에서는 마이크를 사용할 수 없어요.');return;}
 stopSpeech();resetAudio();const epoch=++readingEpoch;recordPending=true;updateRecordingUI();
 let mic;
 try{
  if(!await prepareMicMeter())throw new Error('audio analysis unavailable');
  if(epoch!==readingEpoch)return;
  mic=await navigator.mediaDevices.getUserMedia({audio:true});
  if(epoch!==readingEpoch || hidden || mode!=='podcast' || $('practice-panel').hidden){mic.getTracks().forEach(track=>track.stop());return;}
  readingStream=mic;readingPractice=true;
  if(!startMicMeter(mic)){readingPractice=false;readingStream=null;throw new Error('meter unavailable');}
  for(const track of mic.getTracks())track.addEventListener('ended',()=>{if(readingPractice && epoch===readingEpoch){stopReadingPractice();stopMicMeter();updateRecordingUI();updateAmbience();notice('마이크 연결을 확인한 뒤 다시 시작해 주세요.');}},{once:true});
  $('practice-status').textContent='편하게 읽어주세요. 다 읽으면 같은 버튼을 눌러 마쳐주세요. 녹음은 저장하지 않아요.';notice();
 }catch{mic?.getTracks().forEach(track=>track.stop());if(epoch===readingEpoch)notice('마이크 권한을 확인하고 시작하기를 다시 눌러주세요.');}
 finally{if(epoch===readingEpoch){recordPending=false;updateRecordingUI();updateAmbience();}}
}

// Stories stay separate from audio diary entries: no recording is needed to return.
const storyStorageKey='podguest-stories-v1';
let storedStories={draft:'',stories:[]};
window.storyStorageReady=true;
function storyStorageFailure(){
 $('story-save-status').hidden=false;$('story-save-status').textContent='이 브라우저에 저장하지 못했어요. 페이지를 닫기 전에 이야기를 복사해 주세요.';
}
function writeStories(){
 try{localStorage.setItem(storyStorageKey,JSON.stringify(storedStories));$('story-save-status').textContent='';$('story-save-status').hidden=true;return true;}
 catch{storyStorageFailure();return false;}
}
function saveStoryDraft(){
 if(!window.storyStorageReady)return;
 storedStories.draft=$('story').value;storedStories.draftUpdatedAt=Date.now();writeStories();
}
function saveGeneratedStory(){
 const saved={source:personalStory.source,result:personalStory.result,level:chosenLevel,updatedAt:Date.now()};
 storedStories.current=saved;writeStories();
}
function renderSavedStories(){
 const list=$('saved-story-list');list.replaceChildren();
 if(!storedStories.stories.length){const p=document.createElement('p');p.textContent='보관한 대본이 없어요.';list.append(p);}
 for(const entry of storedStories.stories){
  const row=document.createElement('div');row.className='saved-story-row';
  const open=document.createElement('button');open.type='button';open.className='saved-story-open';
  const title=document.createElement('strong');title.textContent=entry.result.title;
  const preview=document.createElement('span');preview.textContent=entry.source;
  const date=document.createElement('small');date.textContent=new Date(entry.updatedAt).toLocaleDateString('ko-KR')+' · 다시 연습하기';open.append(title,preview,date);
  open.onclick=()=>{cancelStoryGeneration();personalStory={source:entry.source,result:entry.result};activeExampleKey=null;chosenLevel=entry.level||1;$('story').value=entry.source;count();syncLevels();applyStoryLevel();showStep(1);};
  const remove=document.createElement('button');remove.type='button';remove.className='text-button';remove.textContent='삭제';remove.setAttribute('aria-label',entry.result.title+' 이야기 삭제');
  remove.onclick=()=>{storedStories.stories=storedStories.stories.filter(item=>item!==entry);writeStories();renderSavedStories();};
  row.append(open,remove);list.append(row);
 }
}
try{
 const saved=JSON.parse(localStorage.getItem(storyStorageKey)||'null');
 if(saved && typeof saved.draft==='string' && Array.isArray(saved.stories)){
  storedStories.draft=saved.draft.slice(0,2000);storedStories.draftUpdatedAt=Number(saved.draftUpdatedAt)||0;storedStories.startFresh=saved.startFresh===true;
  for(const entry of saved.stories){try{if(typeof entry.source!=='string' || entry.source.length>2000)continue;storedStories.stories.push({...entry,result:normalizeStoryResult(entry.result)});}catch{}}
  if(saved.current){try{storedStories.current={...saved.current,result:normalizeStoryResult(saved.current.result)};personalStory={source:storedStories.current.source,result:storedStories.current.result};}catch{}}
  $('story').value=storedStories.draft;
  if(storedStories.draft || storedStories.startFresh){$('count').textContent=storedStories.draft.length.toLocaleString()+' / 2,000';showWriting();}
 }
}catch{storyStorageFailure();}
renderSavedStories();

// Restore text/stage only. Practice audio stays in memory until the explicit save action.
const practiceTextKey='podguest-current-practice-v1';
let lastPracticeText=null;
function rememberPracticeText(){
 if(!selected || !examples[selected] || mode!=='podcast')return;
 const data=examples[selected];
 if(storedStories.startFresh){storedStories.startFresh=false;writeStories();}
 const state={data,hidden,level:chosenLevel,personalStory,exampleKey:activeExampleKey,updatedAt:Date.now()};
 try{localStorage.setItem(practiceTextKey,JSON.stringify(state));lastPracticeText=state;$('resume-practice').hidden=false;}
 catch{notice('대본을 다시 불러올 수 있도록 보관하지 못했어요. 창을 닫기 전에 복사해 주세요.');}
}
function restorePracticeText(state){
 if(!state || !state.data || typeof state.data.story!=='string' || !Array.isArray(state.data.lines) || !state.data.lines.length || !Array.isArray(state.data.turns) || !state.data.turns.length)return false;
 const validLine=line=>Array.isArray(line) && typeof line[0]==='string' && typeof line[1]==='string';
 if(!state.data.lines.every(validLine) || !state.data.turns.every(validLine))return false;
 selected='resumed-practice';examples[selected]=state.data;mode='podcast';turn=0;conversationComplete=false;hidden=Boolean(state.hidden);chosenLevel=[1,2,3].includes(state.level)?state.level:1;
 personalStory=state.personalStory||null;activeExampleKey=state.exampleKey||null;
 $('story').value=state.data.story;count();syncLevels();$('story-summary').textContent=state.data.story;$('story-kind').textContent='내 이야기 · '+chosenLevel+'단계';resetAudio();showStep(2);renderPractice();return true;
}
$('resume-practice').onclick=()=>restorePracticeText(lastPracticeText);
try{
 const remembered=JSON.parse(localStorage.getItem(practiceTextKey)||'null');
 if(remembered){lastPracticeText=remembered;$('resume-practice').hidden=false;if(!storedStories.startFresh && remembered.updatedAt>=Number(storedStories.draftUpdatedAt||0))restorePracticeText(remembered);}
}catch{notice('지난 연습을 불러오지 못했어요. 저장한 일기장은 그대로 있어요.');}

// Share only the public studio link, never personal text or recordings.
const siteShareLink='https://my-english-podguest.netlify.app/?share=studio-v2';
$('share-link').value=siteShareLink;
function showShareLink(){
 const dialog=$('share-dialog');$('share-status').textContent='링크를 길게 눌러 복사할 수도 있어요.';
 if(!dialog.open){if(dialog.showModal)dialog.showModal();else dialog.setAttribute('open','');}
 $('share-link').focus();$('share-link').select();
}
async function copySiteShareLink(){
 try{
  if(!navigator.clipboard?.writeText)throw new Error('clipboard_unavailable');
  await navigator.clipboard.writeText(siteShareLink);
  if($('share-dialog').open)$('share-status').textContent='링크를 복사했어요.';
  else notice('공유 링크를 복사했어요.');
  return true;
 }catch{showShareLink();return false;}
}
$('share-site').onclick=async()=>{
 const button=$('share-site');if(button.disabled)return;button.disabled=true;
 try{
  if(navigator.share){
   try{await navigator.share({title:'나는 영어 팟게스트',text:'내 하루가, 나의 영어로. 나만의 영어 팟게스트 스튜디오.',url:siteShareLink});return;}
   catch(error){if(error.name==='AbortError')return;}
  }
  await copySiteShareLink();
 }finally{button.disabled=false;}
};
$('copy-share-link').onclick=copySiteShareLink;
$('share-link').onclick=()=>{$('share-link').select();};
$('close-share').onclick=()=>{if($('share-dialog').close)$('share-dialog').close();else $('share-dialog').removeAttribute('open');};

$('new-story').onclick=()=>{
 cancelStoryGeneration();continueAfterVoice=false;
 if(recognition){recognition.onresult=null;recognition.onend=null;recognition.onerror=null;try{if(recognition.abort)recognition.abort();else recognition.stop();}catch{}}
 recognition=null;voiceActive=false;$('voice-tab').classList.remove('selected');$('voice-tab').setAttribute('aria-pressed','false');$('voice-tab').querySelector('span').textContent='눌러서 이야기하기';$('voice-status').textContent='두서없어도 괜찮아요. 당신의 이야기니까.';
 showStep(0);resetAudio();activeExampleKey=null;personalStory=null;selected=null;turn=0;conversationComplete=false;
 storedStories.startFresh=true;$('story').value='';count();showWriting(true);updateAmbience();
};
// Netlify may inject its badge after build. Hide branding only, not application content.
function hideHostingBadge(root){
 if(root.nodeType!==1 && root.nodeType!==9)return;
 const selector='netlify-badge,#netlify-badge,.netlify-badge,#netlify-badge-container,[data-netlify-badge],a';
 const nodes=[...(root.matches?.(selector)?[root]:[]),...root.querySelectorAll(selector)];
 for(const node of nodes){
  const label=[node.textContent,node.getAttribute('aria-label'),node.getAttribute('title'),node.getAttribute('href'),...Array.from(node.querySelectorAll('img')).map(img=>img.alt)].join(' ');
  if(node.matches(selector.replace(',a','')) || (/powered\s+by/i.test(label) && /netlify/i.test(label))){node.style.setProperty('display','none','important');node.setAttribute('aria-hidden','true');}
 }
}
hideHostingBadge(document);
new MutationObserver(records=>{for(const record of records)for(const node of record.addedNodes)hideHostingBadge(node);}).observe(document.body,{childList:true,subtree:true});

$('friend-toggle-script').onclick=()=>{$('toggle-script').click();document.querySelector('.friend-settings').open=false;};
