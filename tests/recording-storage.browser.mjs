// Optional browser regression check. Start npm run dev, then run with Playwright installed.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fixture=JSON.parse(await readFile(new URL('./fixtures/story.json',import.meta.url),'utf8'));
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH || undefined,args:['--no-sandbox']});
try {
 const page=await browser.newPage({viewport:{width:390,height:844}});
 page.setDefaultTimeout(60000);
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.route('https://fonts.googleapis.com/**',route=>route.abort());
 let requests=0;
 await page.route('**/api/story',route=>{requests++;return route.fulfill({json:fixture});});
 await page.addInitScript(()=>{
  const Native=MediaRecorder;
  window.MediaRecorder=class extends Native {
   constructor(...args){
    super(...args);
    this.addEventListener('dataavailable',()=>{window.finalTrackState=this.stream.getAudioTracks()[0].readyState;});
   }
  };
  navigator.mediaDevices.getUserMedia=async()=>{
   const context=new AudioContext();await context.resume();
   const oscillator=context.createOscillator(),gain=context.createGain(),destination=context.createMediaStreamDestination();
   gain.gain.value=.1;oscillator.connect(gain).connect(destination);oscillator.start();
   window.sourceStream=destination.stream;return destination.stream;
  };
 });
 await page.goto(process.env.BASE_URL || 'http://localhost:3000',{waitUntil:'domcontentloaded',timeout:120000});
 await page.click('#write-tab');
 const source='오늘 회사에서 발표를 했다. 시작 전에는 긴장했지만 끝내고 나니 뿌듯했다.';
 await page.fill('#story',source);
 await page.reload({waitUntil:'domcontentloaded'});
 assert.equal(await page.locator('#story').inputValue(),source,'unfinished draft survives refresh');
 await page.click('#make-script');
 await page.waitForSelector('#script-panel:not([hidden])');
 await page.reload({waitUntil:'domcontentloaded'});
 await page.locator('.saved-stories summary').click();
 await page.locator('.saved-story-open').click();
 assert.equal(requests,1,'restored script must not call AI again');
 await page.click('button[data-mode="podcast"]');
 await page.click('#toggle-script');await page.click('#studio-record');
 await page.waitForFunction(()=>recorder?.state==='recording');
 await page.waitForTimeout(3500);await page.click('#studio-record');
 await page.waitForFunction(async()=>(await diaryStore.list()).length===1);
 const recording=await page.evaluate(async()=>{
  const take=(await diaryStore.list())[0],context=new AudioContext();
  try{
   const decoded=await context.decodeAudioData(await take.blob.arrayBuffer());
   const samples=decoded.getChannelData(0),step=Math.floor(decoded.sampleRate*.1);
   let silentWindows=0;
   // Ignore encoder startup/trailing padding; inspect every interior 100 ms window.
   for(let offset=step*2;offset<samples.length-step*2;offset+=step){
    let power=0;for(let i=offset;i<offset+step;i++)power+=samples[i]*samples[i];
    if(Math.sqrt(power/step)<.01)silentWindows++;
   }
   return {duration:decoded.duration,silentWindows,finalTrackState,
    released:sourceStream.getTracks().every(track=>track.readyState==='ended')};
  }finally{await context.close();}
 });
 assert.ok(recording.duration>2,JSON.stringify(recording));
 assert.equal(recording.silentWindows,0,'joined recording must retain continuous source audio');
 assert.equal(recording.finalTrackState,'live','final chunk must arrive before microphone release');
 assert.equal(recording.released,true);
 await page.click('#back-script');await page.click('#edit-story');
 await page.locator('.saved-stories details').evaluate(element=>{element.open=true;});
 await page.locator('.saved-story-row .text-button').click();
 await page.reload({waitUntil:'domcontentloaded'});
 assert.equal(await page.locator('.saved-story-row').count(),0,'deletion survives refresh');
 await page.evaluate(()=>{Storage.prototype.setItem=()=>{throw new Error('quota');};});
 await page.fill('#story','저장 공간이 부족해도 작성한 글은 남겨두기');
 assert.ok((await page.locator('#story-save-status').textContent()).includes('저장하지 못했어요'));
 assert.deepEqual(errors,[]);
 console.log('PASS draft/script persistence, no repeat API call, continuous recording/final chunk, deletion, storage errors',recording);
}finally{await browser.close();}
