// Return the last matching script word. Silence and unrelated words never advance it.
export function readingWordIndex(scriptWords, transcript) {
 const normalize=word=>word.toLowerCase().replace(/[^a-z0-9]/g,'');
 const expected=scriptWords.map(normalize);
 const spoken=transcript.split(/\s+/).map(normalize).filter(Boolean);
 let cursor=0,last=-1;
 for(const word of spoken){
  const next=expected.indexOf(word,cursor);
  if(next>=cursor && next<cursor+4){last=next;cursor=next+1;}
 }
 return last;
}
