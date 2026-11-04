// Recording deletion removes the entire audio-only diary item; written drafts stay separate.
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH || undefined,args:['--no-sandbox']});
try{
 const page=await browser.newPage({viewport:{width:390,height:844}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://fonts.googleapis.com/**',r=>r.abort());await page.goto(process.env.BASE_URL || 'http://localhost:3000',{waitUntil:'domcontentloaded'});
 await page.evaluate(async()=>{const e={id:'first',createdAt:Date.now(),seconds:47,blob:new Blob(['test audio'],{type:'audio/webm'})};await diaryStore.put(e);await diaryStore.put({...e,id:'second',createdAt:e.createdAt-1000});});
 const open=async()=>{await page.locator('.diary-open:visible').first().click();await page.waitForSelector('.diary-entry');};await open();await page.locator('.delete-recording').first().click();await page.waitForFunction(()=>document.querySelectorAll('.diary-entry').length===1);assert.equal(await page.evaluate(async()=>(await diaryStore.list())[0].id),'second');
 await page.reload({waitUntil:'domcontentloaded'});await open();assert.equal(await page.locator('.diary-entry').count(),1);assert.equal(await page.locator('.diary-entry details').count(),0);
 await page.evaluate(()=>{diaryStore.remove=async()=>{throw Error('unavailable');};});await page.locator('.delete-recording').click();await page.waitForFunction(()=>document.querySelector('.save-state').textContent.includes('삭제하지 못했어요'));assert.equal(await page.locator('.diary-entry audio').count(),1);assert.equal(await page.evaluate(async()=>(await diaryStore.list())[0].blob.size),10);assert.deepEqual(errors,[]);console.log('PASS recording item deletion, persistence, other recordings and failed deletion safety');
}finally{await browser.close();}
