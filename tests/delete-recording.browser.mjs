// Optional browser regression check; start the local server with Playwright installed.
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH || undefined,args:['--no-sandbox']});
try{
 const page=await browser.newPage({viewport:{width:390,height:844}});page.setDefaultTimeout(60000);
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://fonts.googleapis.com/**',route=>route.abort());
 const base=process.env.BASE_URL || 'http://localhost:3000';
 await page.goto(base,{waitUntil:'domcontentloaded',timeout:120000});
 await page.evaluate(async()=>{
  const entry={id:'first',createdAt:Date.now(),seconds:47,title:'내 이야기',story:'오늘 산책했다.',lines:[['I went for a walk.','산책했어요.']],blob:new Blob(['test audio'],{type:'audio/webm'})};
  await diaryStore.put(entry);await diaryStore.put({...entry,id:'second',createdAt:entry.createdAt-1000,title:'다른 이야기'});
 });
 const openDiary=async()=>{await page.locator('.diary-open:visible').first().click();await page.waitForSelector('.diary-entry');};
 await openDiary();assert.equal(await page.locator('.diary-entry audio').count(),2);
 assert.equal(await page.locator('.diary-entry audio').first().getAttribute('controlslist'),'nodownload noplaybackrate');
 await page.locator('.delete-recording').first().click();
 await page.waitForFunction(async()=>(await diaryStore.list()).find(e=>e.id==='first').blob===null);
 const saved=await page.evaluate(async()=>(await diaryStore.list()).find(e=>e.id==='first'));
 assert.equal(saved.title,'내 이야기');assert.equal(saved.story,'오늘 산책했다.');
 assert.deepEqual(saved.lines,[['I went for a walk.','산책했어요.']]);assert.ok(saved.audioDeletedAt);
 await page.waitForFunction(()=>document.querySelectorAll('.diary-entry audio').length===1);
 assert.equal(await page.locator('.diary-entry').count(),2,'script card remains after deleting its audio');
 await page.reload({waitUntil:'domcontentloaded'});await openDiary();
 assert.equal(await page.locator('.diary-entry audio').count(),1,'deleted audio must not return on refresh');
 await page.locator('.diary-entry details').first().evaluate(el=>{el.open=true;});
 assert.ok((await page.locator('.diary-entry details').first().textContent()).includes('I went for a walk.'));
 // A failed transaction must keep both the stored recording and its controls.
 await page.evaluate(()=>{diaryStore.removeAudio=async()=>{throw new Error('unavailable');};});
 await page.locator('.delete-recording').click();
 await page.waitForFunction(()=>document.querySelectorAll('.save-state')[1].textContent.includes('삭제하지 못했어요'));
 assert.equal(await page.evaluate(async()=>(await diaryStore.list()).find(e=>e.id==='second').blob.size),10);
 assert.equal(await page.locator('.diary-entry audio').count(),1);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
 assert.deepEqual(errors,[]);
 console.log('PASS audio-only deletion, script/title preservation, persistence, other recordings, failed deletion safety, mobile layout');
}finally{await browser.close();}
