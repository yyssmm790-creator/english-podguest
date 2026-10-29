// Common audio path check with controlled WAV audio, not a real paid API call.
import assert from 'node:assert/strict';
const {chromium,devices}=await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const wav=Buffer.alloc(44+16000);wav.write('RIFF');wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(8000,24);wav.writeUInt32LE(16000,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(16000,40);
for(let i=0;i<8000;i++)wav.writeInt16LE(Math.round(Math.sin(i/8000*Math.PI*2*440)*1000),44+i*2);
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH || undefined,args:['--no-sandbox']});
try{
 for(const [device,profile] of [['desktop',{}],['iPhone',devices['iPhone 13']]]){
  const page=await browser.newPage(profile);page.setDefaultTimeout(60000);const errors=[],requests=[];let fail=false;
  page.on('pageerror',e=>errors.push(e.message));await page.route('https://fonts.googleapis.com/**',r=>r.abort());
  await page.route('**/api/voice-status',r=>r.fulfill({json:{configured:true,provider:'openai'}}));
  await page.route('**/api/speech',r=>{requests.push(r.request().postDataJSON());return r.fulfill(fail?{status:503,json:{error:'speech_provider_unavailable'}}:{contentType:'audio/wav',body:wav});});
  await page.addInitScript(()=>{
   speechSynthesis.getVoices=()=>{throw new Error('Device voices must not be read');};speechSynthesis.speak=()=>{throw new Error('Device synthesis must not be used');};
   navigator.mediaDevices.getUserMedia=async()=>{const context=new AudioContext();await context.resume();const oscillator=context.createOscillator(),destination=context.createMediaStreamDestination();oscillator.connect(destination);oscillator.start();return destination.stream;};
  });
  await page.goto(process.env.BASE_URL || 'http://localhost:3000',{waitUntil:'domcontentloaded',timeout:120000});
  await page.locator('.examples summary').click();await page.click('[data-example="walk"]');await page.click('#make-script');await page.click('button[data-mode="friend"]');
  await page.locator('.friend-settings summary').click();
  assert.deepEqual(await page.locator('#friend-voice option').evaluateAll(options=>options.map(o=>o.value)),['nova','shimmer']);
  await page.click('#preview-voice');await page.waitForFunction(()=>speechActive);await page.waitForFunction(()=>!listening);
  assert.equal(requests[0].voice,'nova');assert.equal(requests[0].text,'How was your day?');
  await page.click('#preview-voice');await page.waitForFunction(()=>speechActive);await page.waitForFunction(()=>!listening);assert.equal(requests.length,1,'repeated sentence reuses generated audio');
  await page.click('[data-person="male"]');assert.deepEqual(await page.locator('#friend-voice option').evaluateAll(options=>options.map(o=>o.value)),['onyx','echo']);
  fail=true;await page.click('#preview-voice');await page.waitForFunction(()=>document.querySelector('#notice').textContent.includes('준비하지 못했어요'));
  assert.equal(await page.locator('#friend-voice option').count(),2,'temporary API failures must not delete common voices');
  fail=false;await page.click('#preview-voice');await page.waitForFunction(()=>speechActive);await page.waitForFunction(()=>!listening);
  await page.locator('.friend-settings summary').click();await page.click('#record');await page.waitForFunction(()=>conversationRunning && recorder?.state==='recording');
  assert.equal(await page.locator('#friend-portrait').getAttribute('data-state'),'listening');
  const count=requests.length;await page.click('#record');assert.equal(await page.locator('.record-label').textContent(),'시작');
  await page.click('#record');await page.waitForFunction(()=>conversationRunning && recorder?.state==='recording');assert.equal(requests.length,count,'resume answer phase must not replay AI question');
  await page.click('#home');assert.equal(await page.locator('#input-panel').isVisible(),true);assert.deepEqual(errors,[]);
  console.log('PASS '+device+' common catalog/audio/cache, API failure recovery, conversation pause/resume, no device synthesis');await page.close();
 }
}finally{await browser.close();}
