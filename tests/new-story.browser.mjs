// Optional browser regression. AI generation and speech recognition are mocked.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fixture=JSON.parse(await readFile(new URL('./fixtures/story.json',import.meta.url),'utf8'));
const source='지난번 회사 발표에 대해 쓰던 이야기';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH || undefined,args:['--no-sandbox']});
try{
 const page=await browser.newPage({viewport:{width:390,height:844}});page.setDefaultTimeout(60000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://fonts.googleapis.com/**',route=>route.abort());await page.route('**/api/voice-status',route=>route.fulfill({json:{configured:true}}));
 await page.addInitScript(({fixture,source})=>{
  if(!localStorage.getItem('new-story-test-seeded')){
   const saved={source,result:fixture,level:2,updatedAt:1};
   localStorage.setItem('podguest-stories-v1',JSON.stringify({draft:source,draftUpdatedAt:1,stories:[saved],current:saved}));
   const level=fixture.levels[1];
   localStorage.setItem('podguest-current-practice-v1',JSON.stringify({data:{story:source,title:fixture.title,level:2,lines:level.podcast.map(l=>[l.en,l.ko]),answerLines:level.dialogue.map(t=>[t.answer.en,t.answer.ko]),turns:level.dialogue.map((t,i)=>[t.question.en,t.question.ko,i])},hidden:false,level:2,personalStory:{source,result:fixture},updatedAt:2}));
   localStorage.setItem('new-story-test-seeded','yes');
  }
  window.SpeechRecognition=class {start(){window.testRecognition=this;this.onstart?.();}abort(){this.aborted=true;this.onend?.();}stop(){this.onend?.();}};
 },{fixture,source});
 await page.goto(process.env.BASE_URL || 'http://localhost:3000',{waitUntil:'domcontentloaded',timeout:120000});
 await page.waitForSelector('#practice-panel:not([hidden])');
 await page.evaluate(async()=>{await diaryStore.put({id:'favorite',createdAt:Date.now(),seconds:10,title:'보관할 기록',story:'소중한 이야기',lines:[['A good day.','좋은 날.']],blob:new Blob(['recording'],{type:'audio/webm'})});});
 await page.click('#home');await page.click('#write-tab');assert.equal(await page.locator('#story').inputValue(),source);
 assert.equal(await page.locator('#story-save-status').isVisible(),false);assert.equal(await page.locator('footer').count(),0);
 assert.equal(await page.locator('.saved-stories summary').textContent(),'이전에 보관한 대본');assert.equal(await page.locator('.saved-stories>small').count(),0);
 await page.click('#new-story');assert.equal(await page.locator('#story').inputValue(),'');assert.equal(await page.locator('#count').textContent(),'0 / 2,000');assert.equal(await page.evaluate(()=>document.activeElement.id),'story');
 assert.equal(await page.evaluate(()=>personalStory),null);assert.equal(await page.evaluate(()=>activeExampleKey),null);
 await page.reload({waitUntil:'domcontentloaded'});assert.equal(await page.locator('#input-panel').isVisible(),true);assert.equal(await page.locator('#writing-area').isVisible(),true);assert.equal(await page.locator('#story').inputValue(),'');
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('podguest-stories-v1')).stories.length),1);
 assert.equal(await page.evaluate(async()=>(await diaryStore.list())[0].blob.size),9);
 await page.locator('.saved-stories summary').click();assert.equal(await page.locator('.saved-story-open').count(),1);await page.click('#resume-practice');assert.equal(await page.evaluate(()=>examples[selected].story),source);
 await page.click('#home');await page.click('#write-tab');await page.click('#new-story');
 // New story cancels a generation in flight without a late response restoring the old draft.
 let release;await page.route('**/api/story',async route=>{await new Promise(resolve=>release=resolve);try{await route.fulfill({json:fixture});}catch{}});
 await page.fill('#story','이제 새 이야기를 만들어 보고 있어요.');await page.click('#make-script');await page.waitForSelector('#generation-progress:not([hidden])');
 await page.click('#new-story');release?.();await page.waitForTimeout(100);assert.equal(await page.locator('#story').inputValue(),'');assert.equal(await page.locator('#story').isEditable(),true);assert.equal(await page.locator('#input-panel').isVisible(),true);
 await page.click('#voice-tab');await page.evaluate(()=>{testRecognition.onresult({resultIndex:0,results:[Object.assign([{transcript:'마이크로 말하던 이야기'}],{isFinal:true})]});});assert.ok((await page.locator('#story').inputValue()).includes('마이크'));
 await page.click('#new-story');assert.equal(await page.evaluate(()=>testRecognition.aborted),true);assert.equal(await page.evaluate(()=>testRecognition.onresult),null);assert.equal(await page.locator('#story').inputValue(),'');assert.equal(await page.locator('#voice-tab').getAttribute('aria-pressed'),'false');
 for(const width of [320,360,390,430,768]){await page.setViewportSize({width,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);const button=await page.locator('#new-story').boundingBox();assert.ok(button.height>=44);}
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:'/tmp/podguest-new-story.png',animations:'disabled',timeout:60000});
 await page.evaluate(()=>{Storage.prototype.setItem=()=>{throw new Error('quota');};});await page.click('#new-story');assert.equal(await page.locator('#story-save-status').isVisible(),true);assert.ok((await page.locator('#story-save-status').textContent()).includes('저장하지 못했어요'));
 assert.deepEqual(errors,[]);console.log('PASS fresh draft and focus; blank survives reload; old practice/archive/favorite preserved; pending AI/voice cancellation; copy removal; responsive touch target; storage error visibility');
}finally{await browser.close();}
