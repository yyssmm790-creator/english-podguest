const {chromium}=require('playwright');const assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});try{
 const page=await browser.newPage({ignoreHTTPSErrors:true,viewport:{width:390,height:844}});const errors=[];page.on('pageerror',e=>errors.push(e.message));let framesLoaded=0;
 await page.route('**/api/shadowing-explain',r=>{const {lines}=r.request().postDataJSON();return r.fulfill({json:{lines:lines.map(()=>({ko:'뜻',phrase:'',meaning:'',word:'',wordMeaning:''}))}})});
 await page.route('**/embed/**',r=>{framesLoaded++;return r.fulfill({contentType:'text/html',body:`<!doctype html><button id="native-play">▶</button><script>
 window.commands=[];window.time=0;
 window.report=(info)=>parent.postMessage(JSON.stringify({event:'infoDelivery',info}),'*');
 document.querySelector('button').onclick=()=>report({playerState:1,currentTime:time});
 addEventListener('message',event=>{let m;try{m=JSON.parse(event.data)}catch{return}if(m.event==='listening'){report({currentTime:time});return}if(m.event!=='command')return;commands.push(m);if(m.func==='seekTo'){time=m.args[0];report({currentTime:time})}if(m.func==='pauseVideo')report({playerState:2,currentTime:time});if(m.func==='playVideo')report({playerState:1,currentTime:time});});
 <\/script>`})});
 await page.goto(process.env.BASE_URL||'http://localhost:3003');await page.waitForSelector('#segment-grid button');await page.getByRole('button',{name:'4구간 선택',exact:true}).click();await page.click('#start-practice');await page.click('#practice-listen');
 const iframe=page.locator('#practice-player-slot iframe');await iframe.waitFor();const frame=await iframe.elementHandle().then(e=>e.contentFrame());
 await frame.waitForFunction(()=>commands.some(c=>c.func==='seekTo'));
 const lesson=await page.evaluate(()=>fetch('/shadowing/jenny.json').then(r=>r.json()));const range=lesson.segments[3].lines[0];
 assert.equal(await frame.evaluate(()=>commands.find(c=>c.func==='seekTo').args[0]),range.start,'selected segment start');
 assert.equal(new URL(await iframe.getAttribute('src')).searchParams.has('end'),false,'no obsolete embed end time');
 for(let n=0;n<3;n++){
  const before=await frame.evaluate(()=>commands.filter(c=>c.func==='seekTo').length);
  await frame.evaluate(end=>{time=end;report({currentTime:time,playerState:1});report({currentTime:time,playerState:1})},range.end);
  await frame.waitForFunction(()=>commands.at(-1)?.func==='pauseVideo');
  assert.equal(await frame.evaluate(()=>commands.filter(c=>c.func==='seekTo').length),before,'does not loop automatically');
  await frame.click('#native-play');
  await frame.waitForFunction(count=>commands.filter(c=>c.func==='seekTo').length===count,before+1);
  assert.equal(await frame.evaluate(()=>commands.filter(c=>c.func==='seekTo').at(-1).args[0]),range.start,'native Play restarts same range');
 }
 await page.click('#practice-listen');assert.equal(framesLoaded,1,'app replay reuses player too');
 await page.click('#sentence-next');assert.equal(await page.locator('#practice-player-slot').isVisible(),false);await page.click('#practice-listen');
 assert.equal(framesLoaded,1,'next sentence preserves player buffer');
 await frame.waitForFunction(start=>commands.filter(c=>c.func==='seekTo').at(-1).args[0]===start,lesson.segments[3].lines[1].start);
 assert.deepEqual(errors,[]);console.log('PASS: native video Play restarts the same clip three times; no automatic loop; app replay and next sentence reuse iframe; correct selected times; no page errors. YouTube messages simulated.');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});
