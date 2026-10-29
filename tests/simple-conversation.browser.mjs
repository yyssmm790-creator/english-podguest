// Native audio + controlled microphone. No paid AI call or external message.
import assert from 'node:assert/strict';
const {chromium,devices}=await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const wav=Buffer.alloc(44+8000);wav.write('RIFF');wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(8000,24);wav.writeUInt32LE(16000,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(8000,40);
for(let i=0;i<4000;i++)wav.writeInt16LE(Math.round(Math.sin(i/8000*Math.PI*880)*1500),44+i*2);
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH || undefined,args:['--no-sandbox']});
try{
 for(const [label,profile] of [['desktop',{}],['iPhone',devices['iPhone 13']]]){
  const page=await browser.newPage(profile);page.setDefaultTimeout(60000);const errors=[],requests=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('https://fonts.googleapis.com/**',r=>r.abort());await page.route('**/api/voice-status',r=>r.fulfill({json:{configured:true}}));
  let hold=false,pending=[];
  await page.route('**/api/speech',async r=>{requests.push(r.request().postDataJSON());if(hold)await new Promise(resolve=>pending.push(resolve));try{await r.fulfill({contentType:'audio/wav',body:wav});}catch{}});
  await page.addInitScript(()=>{navigator.mediaDevices.getUserMedia=async()=>{const c=new AudioContext();await c.resume();const oscillator=c.createOscillator(),gain=c.createGain(),out=c.createMediaStreamDestination();gain.gain.value=0;oscillator.connect(gain).connect(out);oscillator.start();window.testGain=gain;window.testStream=out.stream;return out.stream;};});
  await page.goto(process.env.BASE_URL || 'http://localhost:3000',{waitUntil:'domcontentloaded',timeout:120000});await page.locator('.examples summary').click();await page.click('[data-example="work"]');await page.click('#make-script');await page.click('button[data-mode="friend"]');
  assert.equal(await page.locator('.record-label').textContent(),'시작');assert.equal(await page.locator('.friend-settings').getAttribute('open'),null);assert.equal(await page.locator('#next-question').isVisible(),false);
  assert.equal(await page.locator('.speaker-label').count(),0);assert.equal(await page.locator('.orb-caption').isVisible(),false);assert.equal(await page.locator('#live-voice-label').evaluate(el=>getComputedStyle(el).clipPath),'inset(50%)');
  // Default voice, no settings interaction.
  await page.click('#record');assert.equal(await page.locator('.record-label').textContent(),'멈춤');await page.waitForFunction(()=>conversationRunning && recorder?.state==='recording');assert.equal(requests[0].voice,'nova');
  assert.equal(await page.locator('#friend-portrait').getAttribute('data-state'),'listening');assert.equal(await page.locator('#notice').textContent(),'');assert.equal(await page.locator('#practice-status').textContent(),'');
  // Real input energy then silence naturally advances once.
  await page.evaluate(()=>{testGain.gain.value=.12;});await page.waitForFunction(()=>turnDetector.hasSpeech);await page.evaluate(()=>{testGain.gain.value=0;});
  await page.waitForFunction(()=>turn===1 && conversationRunning && recorder?.state==='recording');assert.equal(requests.length,2);
  // Repeated two-state toggle always resumes the same listening phase.
  for(let i=0;i<3;i++){
   const count=requests.length;await page.click('#record');assert.equal(await page.locator('.record-label').textContent(),'시작');await page.waitForFunction(()=>!recordingFinalizing);await page.click('#record');await page.waitForFunction(()=>conversationRunning && recorder?.state==='recording');assert.equal(await page.locator('.record-label').textContent(),'멈춤');assert.equal(requests.length,count);assert.equal(await page.evaluate(()=>turn),1);
  }
  await page.evaluate(()=>{document.querySelector('#record').click();document.querySelector('#record').click();});await page.waitForFunction(()=>conversationRunning && recorder?.state==='recording' && !recordingFinalizing);assert.equal(await page.locator('.record-label').textContent(),'멈춤');
  // Listen icon pauses the conversation and plays the latest answer, not a text button.
  await page.evaluate(()=>{testGain.gain.value=.12;});await page.waitForTimeout(600);await page.click('#listen-own');await page.waitForFunction(()=>!conversationRunning && document.querySelector('#recording-result audio')?.paused===false);
  assert.equal(await page.locator('#recording-result button').count(),0);assert.equal(await page.locator('#recording-result').isVisible(),false);const heardCount=requests.length;await page.waitForFunction(()=>document.querySelector('#recording-result audio').paused);await page.click('#record');await page.waitForFunction(()=>conversationRunning && recorder?.state==='recording');assert.equal(requests.length,heardCount);
  // Stop while the next AI question is still being prepared, then resume it once.
  hold=true;await page.click('#next-question');await page.waitForFunction(()=>listening && conversationStage==='question');await page.click('#record');assert.equal(await page.locator('.record-label').textContent(),'시작');
  await page.click('#record');hold=false;pending.forEach(resolve=>resolve());pending=[];await page.waitForFunction(()=>conversationRunning && recorder?.state==='recording');assert.equal(await page.evaluate(()=>turn),2);
  await page.click('#record');await page.waitForFunction(()=>!recordingFinalizing);assert.equal(await page.locator('#notice').textContent(),'','stopping before speaking must not show an empty-recording popup');
  // Viewport remains fixed while long question/answer text scrolls inside their areas.
  const original=await page.evaluate(()=>({q:document.querySelector('#question-en').textContent,a:document.querySelector('#practice-script p').textContent}));
  await page.evaluate(()=>{document.querySelector('#question-en').textContent='A long question about your day. '.repeat(25);document.querySelector('#practice-script p').textContent='My detailed answer about today. '.repeat(25);});
  for(const [width,height] of [[320,568],[360,640],[390,844],[430,932],[768,1024],[844,390]]){
   await page.setViewportSize({width,height});const geometry=await page.evaluate(()=>({width:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight,controls:document.querySelector('.practice-controls').getBoundingClientRect().toJSON()}));
   assert.ok(geometry.width<=width+1,JSON.stringify(geometry));assert.ok(geometry.height<=height+1,JSON.stringify(geometry));assert.ok(geometry.controls.bottom<=height+1,JSON.stringify(geometry));
  }
  await page.setViewportSize({width:390,height:844});await page.evaluate(original=>{document.querySelector('#question-en').textContent=original.q;document.querySelector('#practice-script p').textContent=original.a;},original);
  await page.evaluate(()=>{const badge=document.createElement('a');badge.href='https://www.netlify.com';badge.textContent='Powered by Netlify';badge.id='test-injected-badge';document.body.append(badge);});await page.waitForFunction(()=>getComputedStyle(document.querySelector('#test-injected-badge')).display==='none');
  await page.screenshot({path:'/tmp/simple-conversation-'+label+'.png',animations:'disabled',timeout:60000});assert.deepEqual(errors,[]);console.log('PASS '+label+' default start, real voice auto-next, repeated/rapid stop-start, hear own answer, pending question resume, six viewport fits, injected badge hidden');await page.close();
 }
}finally{await browser.close();}
