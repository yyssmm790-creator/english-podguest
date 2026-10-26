// Optional browser check. Uses a controlled microphone; no paid API request.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fixture=JSON.parse(await readFile(new URL('./fixtures/story.json',import.meta.url),'utf8'));
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH || undefined,args:['--no-sandbox']});
try{
 const page=await browser.newPage({viewport:{width:390,height:844}});page.setDefaultTimeout(60000);
 const errors=[];let calls=0;page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://fonts.googleapis.com/**',r=>r.abort());await page.route('**/api/voice-status',r=>r.fulfill({json:{configured:true,provider:'openai'}}));
 await page.route('**/api/story',r=>{calls++;return r.fulfill({json:fixture});});
 await page.addInitScript(()=>{navigator.mediaDevices.getUserMedia=async()=>{
  const context=new AudioContext();await context.resume();const oscillator=context.createOscillator(),gain=context.createGain(),destination=context.createMediaStreamDestination();
  gain.gain.value=.1;oscillator.connect(gain).connect(destination);oscillator.start();window.testStream=destination.stream;return destination.stream;
 };});
 const source='오늘 회사에서 발표를 했다. 처음에는 긴장했지만 잘 마쳤다.';
 await page.goto(process.env.BASE_URL || 'http://localhost:3000',{waitUntil:'domcontentloaded',timeout:120000});
 await page.click('#write-tab');await page.fill('#story',source);await page.locator('#input-panel [data-level="2"]').click();await page.click('#make-script');await page.click('button[data-mode="podcast"]');
 assert.equal(await page.locator('#podcast-hero').count(),0);assert.equal(await page.locator('#record').isVisible(),false);
 assert.equal(await page.locator('#studio-record').isVisible(),true);
 const visibleControls=()=>page.locator('.practice-controls button:visible').evaluateAll(buttons=>buttons.map(button=>button.id));
 assert.deepEqual(await visibleControls(),['listen-practice','listen-own','restart']);
 for(const width of [320,360,390,430,768]){await page.setViewportSize({width,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);const mic=await page.locator('#studio-record').boundingBox();assert.ok(mic.width>=44 && mic.height>=44);}
 await page.setViewportSize({width:390,height:844});
 // Read and hear immediately without creating a diary record.
 await page.click('#studio-record');await page.waitForFunction(()=>recorder?.state==='recording');await page.waitForTimeout(1500);await page.click('#listen-own');
 await page.waitForFunction(()=>latestPracticeTake && !document.querySelector('#recording-result audio').paused);
 assert.equal((await page.evaluate(()=>diaryStore.list())).length,0);
 await page.click('#listen-own');await page.waitForFunction(()=>document.querySelector('#listen-own').getAttribute('aria-pressed')==='false');assert.equal(await page.evaluate(()=>document.querySelector('#recording-result audio').paused),true);
 await page.click('#restart');assert.equal(await page.locator('#listen-own').isDisabled(),true);
 // The original large microphone stage has its own listen/save/retry controls.
 await page.click('#toggle-script');assert.equal(await page.locator('#studio-record').isVisible(),false);assert.equal(await page.locator('#large-studio-record').isVisible(),true);
 assert.deepEqual(await visibleControls(),['listen-own','save-take','restart']);
 await page.screenshot({path:'/tmp/podguest-large-mic.png',animations:'disabled',timeout:60000});
 await page.click('#large-studio-record');await page.waitForFunction(()=>recorder?.state==='recording');await page.waitForTimeout(1500);await page.click('#large-studio-record');
 await page.waitForFunction(()=>latestPracticeTake && !recordingFinalizing);assert.equal((await page.evaluate(()=>diaryStore.list())).length,0);
 await page.evaluate(()=>{window.realDiaryPut=diaryStore.put;diaryStore.put=async()=>{throw new Error('storage full');};});await page.click('#save-take');await page.waitForFunction(()=>document.querySelector('#notice').textContent.includes('저장하지 못했어요'));assert.equal(await page.evaluate(()=>latestPracticeTake.saved),false);assert.equal((await page.evaluate(()=>diaryStore.list())).length,0);await page.evaluate(()=>{diaryStore.put=realDiaryPut;});
 await page.click('#save-take');await page.waitForFunction(()=>latestPracticeTake?.saved);
 let entries=await page.evaluate(()=>diaryStore.list());assert.equal(entries.length,1);assert.equal(entries[0].story,source);assert.equal(entries[0].level,2);assert.equal(entries[0].title,fixture.title);assert.deepEqual(entries[0].lines,fixture.levels[1].podcast.map(line=>[line.en,line.ko]));
 await page.evaluate(()=>document.querySelector('#save-take').onclick());assert.equal((await page.evaluate(()=>diaryStore.list())).length,1,'saving twice must not duplicate the chosen take');
 await page.click('#large-studio-record');await page.waitForFunction(()=>recorder?.state==='recording');await page.waitForTimeout(1200);await page.click('#restart');await page.waitForFunction(()=>!recordingFinalizing);
 assert.equal(await page.locator('#large-studio-record').isVisible(),true);assert.equal(await page.locator('#listen-own').isDisabled(),true);assert.equal((await page.evaluate(()=>diaryStore.list())).length,1,'retry does not create a diary entry');
 // Closing/reopening restores the text and stage, never restarts the mic.
 await page.reload({waitUntil:'domcontentloaded'});await page.waitForSelector('#large-studio-record:visible');
 assert.equal(await page.evaluate(()=>examples[selected].story),source);assert.deepEqual(await page.evaluate(()=>examples[selected].lines),fixture.levels[1].podcast.map(line=>[line.en,line.ko]));
 assert.equal(await page.locator('#listen-own').isDisabled(),true);assert.equal(await page.evaluate(()=>recorder?.state==='recording'),false);assert.equal(calls,1,'restoring text must not regenerate AI scripts');
 await page.click('#toggle-script');await page.screenshot({path:'/tmp/podguest-reading-controls.png',animations:'disabled',timeout:60000});
 await page.click('#studio-record');await page.waitForFunction(()=>recorder?.state==='recording');await page.waitForTimeout(1200);await page.reload({waitUntil:'domcontentloaded'});await page.waitForSelector('#studio-record:visible');
 assert.equal(await page.evaluate(()=>examples[selected].story),source);assert.equal((await page.evaluate(()=>diaryStore.list())).length,1,'closing practice does not save audio');
 await page.click('#home .brand-en');assert.equal(await page.locator('#input-panel').isVisible(),true);assert.equal(await page.locator('#writing-area').isVisible(),false);
 await page.click('#write-tab');await page.fill('#story','다음 날 새로 적기 시작한 이야기');await page.reload({waitUntil:'domcontentloaded'});assert.equal(await page.locator('#input-panel').isVisible(),true);assert.equal(await page.locator('#story').inputValue(),'다음 날 새로 적기 시작한 이야기');await page.locator('.saved-stories summary').click();await page.click('#resume-practice');assert.equal(await page.evaluate(()=>examples[selected].story),source);
 assert.deepEqual(errors,[]);console.log('PASS read/hear without saving; restored large mic; explicit one-pair favorites; retry discards; reopen restores text only; no automatic diary writes; phone layout');
}finally{await browser.close();}
