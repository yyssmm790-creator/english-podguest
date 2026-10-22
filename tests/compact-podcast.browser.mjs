// Optional browser check. Run against a local server with Playwright installed.
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH || undefined,args:['--no-sandbox']});
try{
 const page=await browser.newPage({viewport:{width:390,height:844}});page.setDefaultTimeout(60000);
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.route('https://fonts.googleapis.com/**',route=>route.abort());
 await page.addInitScript(()=>{
  navigator.mediaDevices.getUserMedia=async()=>{
   const context=new AudioContext();await context.resume();
   const oscillator=context.createOscillator(),gain=context.createGain(),destination=context.createMediaStreamDestination();
   gain.gain.value=.1;oscillator.connect(gain).connect(destination);oscillator.start();
   window.testStream=destination.stream;return destination.stream;
  };
 });
 await page.goto(process.env.BASE_URL || 'http://localhost:3000',{waitUntil:'domcontentloaded',timeout:120000});
 await page.locator('.examples summary').click();await page.click('[data-example="walk"]');await page.click('#make-script');await page.click('button[data-mode="podcast"]');
 assert.equal(await page.locator('#podcast-hero').count(),0);
 assert.equal(await page.locator('#record').isVisible(),false);
 assert.equal(await page.locator('#practice-disclaimer').isVisible(),false);
 assert.equal(await page.locator('#practice-status').isVisible(),false);
 assert.equal(await page.locator('.practice-top #studio-record').isVisible(),true);
 for(const width of [320,360,390,430,768]){
  await page.setViewportSize({width,height:844});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'overflow '+width);
  const mic=await page.locator('#studio-record').boundingBox();assert.ok(mic.width>=44 && mic.height>=44);
 }
 await page.setViewportSize({width:390,height:844});
 await page.evaluate(()=>{const script=document.querySelector('#practice-script');for(let i=0;i<12;i++){const clone=script.firstElementChild.cloneNode(true);clone.classList.add('test-long-script');script.append(clone);}window.scrollTo(0,450);});
 await page.waitForTimeout(100);const stickyMic=await page.locator('#studio-record').boundingBox();assert.ok(stickyMic.y>=70 && stickyMic.y<140,'microphone stays below the header while scrolling');
 await page.evaluate(()=>{document.querySelectorAll('.test-long-script').forEach(el=>el.remove());window.scrollTo(0,0);});
 assert.ok((await page.locator('#practice-script').boundingBox()).y+(await page.locator('#practice-script').boundingBox()).height<844,'four-line sample should fit on a phone');
 await page.click('#studio-record');await page.waitForFunction(()=>recorder?.state==='recording');
 assert.equal(await page.locator('#studio-record').getAttribute('aria-pressed'),'true');
 await page.waitForFunction(()=>Number(document.querySelector('#studio-record').style.getPropertyValue('--mic-level'))>.05);
 await page.waitForTimeout(1200);await page.click('#toggle-script');
 assert.equal(await page.locator('#studio-record').getAttribute('aria-pressed'),'true','hiding script must not stop recording');
 await page.click('#toggle-script');await page.click('#studio-record');
 await page.waitForFunction(async()=>(await diaryStore.list()).length===1);
 assert.equal(await page.locator('#studio-record').getAttribute('aria-pressed'),'false');
 assert.equal(await page.evaluate(()=>testStream.getTracks().every(track=>track.readyState==='ended')),true);
 // Leaving an active take via the brand saves it and stops the microphone.
 await page.click('#studio-record');await page.waitForFunction(()=>recorder?.state==='recording');await page.waitForTimeout(1200);
 await page.click('#home .brand-en');await page.waitForFunction(async()=>(await diaryStore.list()).length===2);
 assert.equal(await page.locator('#input-panel').isVisible(),true);
 assert.equal(await page.locator('#writing-area').isVisible(),false);
 assert.equal(await page.evaluate(()=>testStream.getTracks().every(track=>track.readyState==='ended')),true);
 const takes=await page.evaluate(async()=>(await diaryStore.list()).map(e=>({size:e.blob.size,lines:e.lines.length,story:e.story})));
 assert.ok(takes.every(e=>e.size>0 && e.lines===4 && e.story.includes('산책')));
 // Brand is also a home link from conversation and diary screens.
 await page.click('#write-tab');await page.click('#make-script');await page.click('button[data-mode="friend"]');await page.click('#home');assert.equal(await page.locator('#input-panel').isVisible(),true);
 await page.locator('.diary-open:visible').first().click();await page.waitForSelector('.diary-entry');await page.click('#home');assert.equal(await page.locator('#input-panel').isVisible(),true);
 assert.deepEqual(errors,[]);
 await page.click('#write-tab');await page.click('#make-script');await page.click('button[data-mode="podcast"]');
 await page.screenshot({path:process.env.SCREENSHOT_PATH || '/tmp/compact-podcast.png',animations:'disabled',timeout:60000});
 console.log('PASS compact phone layout; upper mic signal/toggle/auto-save; script visibility without splitting; logo home/save/release from podcast, conversation, diary');
}finally{await browser.close();}
