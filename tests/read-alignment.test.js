import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readingWordIndex} from '../public/read-alignment.js';
const script='I went for a walk this evening. The air was cool.'.split(' ');
test('reading follows individual interim words including punctuation',()=>{
 assert.equal(readingWordIndex(script,'I'),0);
 assert.equal(readingWordIndex(script,'I went'),1);
 assert.equal(readingWordIndex(script,'I went for a walk this evening'),6);
});
test('silence and unrelated speech do not advance and cannot jump across sentences',()=>{
 assert.equal(readingWordIndex(script,''),-1);
 assert.equal(readingWordIndex(script,'unrelated speech'),-1);
 assert.equal(readingWordIndex(script,'cool'),-1);
});
test('allows small recognition omissions and reevaluates corrected interim results',()=>{
 assert.equal(readingWordIndex(script,'I went a walk'),4);
 assert.equal(readingWordIndex(script,'I went for'),2);
 assert.equal(readingWordIndex(["I'm",'happy.'],'Im happy'),1);
});
