// Optional browser check; run against a local server with Playwright installed.
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH || undefined,args:['--no-sandbox']});
try{
 const page=await browser.newPage();page.setDefaultTimeout(60000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://fonts.googleapis.com/**',r=>r.abort());await page.route('**/api/voice-status',r=>r.fulfill({json:{configured:false}}));
 await page.addInitScript(()=>{
  const local=['Samantha','Alex'].map(name=>({name,voiceURI:name,lang:'en-US',localService:true}));
  const online=['Annette','Carly','Darren','Duncan'].map(name=>({name:'Microsoft '+name+' Online (Natural) – English (Australia)',voiceURI:name,lang:'en-AU',localService:false}));
  speechSynthesis.getVoices=()=>[...online,...local];speechSynthesis.cancel=()=>{};
  window.SpeechSynthesisUtterance=class{constructor(text){this.text=text;}};
  speechSynthesis.speak=u=>{window.lastSpeech=u;};
 });
 await page.goto(process.env.BASE_URL || 'http://localhost:3000',{waitUntil:'domcontentloaded',timeout:120000});
 assert.deepEqual(await page.locator('#friend-voice option').allTextContents(),['Samantha · en-US','Alex · en-US']);
 await page.evaluate(()=>document.querySelector('#preview-voice').click());await page.evaluate(()=>lastSpeech.onerror());
 assert.deepEqual(await page.locator('#friend-voice option').allTextContents(),['Alex · en-US']);
 assert.equal(await page.locator('#friend-voice').inputValue(),'device:Alex');
 await page.reload({waitUntil:'domcontentloaded'});
 assert.deepEqual(await page.locator('#friend-voice option').allTextContents(),['Alex · en-US']);
 await page.evaluate(()=>document.querySelector('#preview-voice').click());await page.evaluate(()=>lastSpeech.onerror());
 assert.equal(await page.locator('#friend-voice option').count(),0);assert.equal(await page.locator('#preview-voice').isDisabled(),true);
 await page.evaluate(()=>speechSynthesis.dispatchEvent(new Event('voiceschanged')));assert.equal(await page.locator('#friend-voice option').count(),0);
 assert.deepEqual(errors,[]);console.log('PASS reported online voices excluded; failed voice removed with next selected; exclusion persists after reload/voiceschanged; empty list disables playback');
}finally{await browser.close();}
