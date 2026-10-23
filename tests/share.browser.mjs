// Optional local browser check. Native sharing is mocked; no message is sent.
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH || undefined,args:['--no-sandbox']});
try{
 const page=await browser.newPage({viewport:{width:390,height:844}});page.setDefaultTimeout(60000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://fonts.googleapis.com/**',r=>r.abort());await page.route('**/api/voice-status',r=>r.fulfill({json:{configured:true}}));
 await page.addInitScript(()=>{
  window.shareMode='ok';window.clipboardMode='ok';window.shared=[];window.copied=[];
  Object.defineProperty(navigator,'share',{configurable:true,value:async data=>{shared.push(data);if(shareMode==='abort')throw new DOMException('Cancelled','AbortError');if(shareMode==='fail')throw new Error('Unavailable');}});
  Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{if(clipboardMode==='fail')throw new Error('Denied');copied.push(text);}}});
 });
 await page.goto(process.env.BASE_URL || 'http://localhost:3000',{waitUntil:'domcontentloaded',timeout:120000});
 for(const width of [320,360,390,430,768,1280]){
  await page.setViewportSize({width,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'overflow '+width);
  const button=await page.locator('#share-site').boundingBox();assert.ok(button.width>=44 && button.height>=44);assert.ok(button.x+button.width<=width);
 }
 await page.setViewportSize({width:390,height:844});await page.click('#share-site');
 const payload=await page.evaluate(()=>shared[0]);assert.equal(payload.url,'https://my-english-podguest.netlify.app/?share=studio-v2');assert.equal(payload.title,'나는 영어 팟게스트');assert.equal(await page.evaluate(()=>copied.length),0);
 assert.equal(await page.locator('meta[property="og:url"]').getAttribute('content'),payload.url);
 assert.equal(await page.locator('meta[property="og:image"]').getAttribute('content'),'https://my-english-podguest.netlify.app/studio-share.png');
 const image=await page.request.get(new URL('/studio-share.png',page.url()).href);assert.equal(image.status(),200);const bytes=await image.body();assert.equal(bytes.readUInt32BE(16),1200);assert.equal(bytes.readUInt32BE(20),630);
 await page.evaluate(()=>{shareMode='abort';});await page.click('#share-site');assert.equal(await page.evaluate(()=>copied.length),0,'cancel does not copy or send');
 await page.evaluate(()=>{shareMode='fail';});await page.click('#share-site');assert.equal(await page.evaluate(()=>copied[0]),payload.url);
 await page.evaluate(()=>{Object.defineProperty(navigator,'share',{configurable:true,value:undefined});});await page.click('#share-site');assert.equal(await page.evaluate(()=>copied.length),2);
 await page.evaluate(()=>{clipboardMode='fail';});await page.click('#share-site');await page.waitForSelector('#share-dialog[open]');assert.equal(await page.locator('#share-link').inputValue(),payload.url);assert.equal(await page.locator('#share-link').getAttribute('readonly'),'');
 await page.evaluate(()=>{clipboardMode='ok';});await page.click('#copy-share-link');assert.ok((await page.locator('#share-status').textContent()).includes('복사했어요'));await page.click('#close-share');assert.equal(await page.locator('#share-dialog').isVisible(),false);
 assert.deepEqual(errors,[]);await page.screenshot({path:'/tmp/podguest-share-header.png',animations:'disabled',timeout:60000});
 console.log('PASS native share payload; studio preview metadata/image; cancel; clipboard; manual fallback; six responsive widths; no message sent');
}finally{await browser.close();}
