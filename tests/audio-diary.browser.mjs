// User-browser reset, audio-only diary, and independent written drafts. No paid AI calls.
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH || undefined,args:['--no-sandbox']});
try{
 const page=await browser.newPage({viewport:{width:390,height:740}});page.setDefaultTimeout(30000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://fonts.googleapis.com/**',r=>r.abort());await page.route('**/api/voice-status',r=>r.fulfill({json:{configured:true}}));
 await page.goto(process.env.BASE_URL || 'http://localhost:3000',{waitUntil:'domcontentloaded'});
 await page.click('#write-story');await page.fill('#story','대본은 나중에 연습하려고 보관해요.');await page.locator('.saved-stories summary').click();await page.click('#save-story-text');assert.equal(await page.locator('.saved-story-row').count(),1);assert.equal(await page.evaluate(async()=>(await diaryStore.list()).length),0);
 await page.evaluate(async()=>{
  const blob=new Blob(['audio'],{type:'audio/webm'}),entry={id:'first',createdAt:Date.now(),seconds:47,blob,story:'not in diary',lines:[['No script.','대본 아님']],title:'not saved',level:3};
  await diaryStore.put(entry);await diaryStore.put({...entry,id:'second',createdAt:entry.createdAt-1000});
  const raw=await diaryStore.run('readonly',store=>store.get('first'));if(Object.keys(raw).sort().join(',')!=='blob,createdAt,id,seconds')throw Error('Metadata persisted');
  // Legacy script-only entries are not displayed, but a reset must clear them too.
  await diaryStore.run('readwrite',store=>store.put({id:'legacy-script',createdAt:Date.now(),blob:null,story:'old text'}));
 });
 await page.locator('.diary-open:visible').first().click();await page.waitForSelector('.diary-entry');assert.equal(await page.locator('.diary-entry').count(),2);assert.equal(await page.locator('.diary-entry time').count(),2);assert.equal(await page.locator('.diary-entry details,.diary-entry input').count(),0);
 await page.evaluate(()=>{window.originalRemove=diaryStore.remove;diaryStore.remove=async()=>{throw Error('unavailable');};});await page.locator('.delete-recording').first().click();await page.waitForFunction(()=>document.querySelector('.save-state').textContent.includes('삭제하지 못했어요'));assert.equal(await page.locator('.diary-entry').count(),2);await page.evaluate(()=>diaryStore.remove=originalRemove);
 await page.locator('.delete-recording').first().click();await page.waitForFunction(()=>document.querySelectorAll('.diary-entry').length===1);assert.equal(await page.evaluate(async()=>(await diaryStore.list())[0].id),'second');
 await page.reload({waitUntil:'domcontentloaded'});await page.locator('.diary-open:visible').first().click();await page.waitForSelector('.diary-entry');assert.equal(await page.locator('.diary-entry').count(),1);
 page.once('dialog',d=>d.dismiss());await page.click('#reset-diary');assert.equal(await page.locator('.diary-entry').count(),1);
 await page.evaluate(()=>{window.originalClear=diaryStore.clear;diaryStore.clear=async()=>{throw Error('unavailable');};});page.once('dialog',d=>d.accept());await page.click('#reset-diary');await page.waitForFunction(()=>document.querySelector('#notice').textContent.includes('초기화하지 못했어요'));assert.equal(await page.locator('.diary-entry').count(),1);await page.evaluate(()=>diaryStore.clear=originalClear);
 page.once('dialog',d=>d.accept());await page.click('#reset-diary');await page.waitForFunction(()=>document.querySelectorAll('.diary-entry').length===0);assert.equal(await page.evaluate(()=>diaryStore.run('readonly',store=>store.count())),0);
 await page.click('#diary-back');await page.reload({waitUntil:'domcontentloaded'});await page.locator('.saved-stories summary').click();assert.equal(await page.locator('.saved-story-row').count(),1);await page.click('.saved-story-open');assert.equal(await page.locator('#story').inputValue(),'대본은 나중에 연습하려고 보관해요.');assert.deepEqual(errors,[]);
 console.log('PASS audio-only schema, draft separation, date cards, delete/reset failures, confirmation, reset persistence and preserved drafts');
}finally{await browser.close();}
