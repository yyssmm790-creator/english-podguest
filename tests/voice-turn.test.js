import {test} from 'node:test';
import assert from 'node:assert/strict';
import {VoiceTurnDetector} from '../public/voice-turn.js';

function feed(detector,from,to,volume){let ends=0;for(let t=from;t<=to;t+=50)if(detector.observe(volume,t))ends++;return ends;}
test('silence never counts as an answer',()=>{
 const detector=new VoiceTurnDetector();assert.equal(feed(detector,0,30000,.001),0);assert.equal(detector.hasSpeech,false);
});
test('waits through a short hesitation and ends once after three seconds of silence',()=>{
 const detector=new VoiceTurnDetector();feed(detector,0,800,.06);assert.equal(detector.hasSpeech,true);
 assert.equal(feed(detector,850,2800,.001),0);
 assert.equal(feed(detector,2850,3450,.06),0);
 assert.equal(feed(detector,3500,6400,.001),0);
 assert.equal(feed(detector,6450,12000,.001),1);
});
test('isolated clicks and low background sound do not advance a turn',()=>{
 const detector=new VoiceTurnDetector();for(let t=0;t<15000;t+=50)assert.equal(detector.observe(t%2000===0?.2:.004,t),false);assert.equal(detector.hasSpeech,false);
});
test('reset requires new speech, and a delayed frame cannot invent a long utterance',()=>{
 const detector=new VoiceTurnDetector();assert.equal(detector.observe(.1,5000),false);assert.equal(detector.hasSpeech,false);
 feed(detector,5050,5650,.06);feed(detector,5700,9000,.001);assert.equal(detector.ended,true);
 detector.reset(10000);assert.equal(feed(detector,10000,16000,.001),0);assert.equal(detector.hasSpeech,false);
});
