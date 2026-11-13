export function videoId(value){
 let url;try{url=new URL(value)}catch{return null}
 if(!['https:','http:'].includes(url.protocol))return null;
 const host=url.hostname.toLowerCase().replace(/^www\./,'');let id;
 if(host==='youtu.be')id=url.pathname.split('/')[1];
 else if(['youtube.com','m.youtube.com','youtube-nocookie.com'].includes(host))id=url.searchParams.get('v')||url.pathname.match(/^\/(?:embed|shorts|live)\/([^/]+)/)?.[1];
 return /^[a-zA-Z0-9_-]{11}$/.test(id||'')?id:null;
}
export function splitSpeech(text){
 // Keep the speaker's actual words, including fillers; divide long speech at pauses.
 const sentences=text.replace(/\s+/g,' ').trim().match(/[^.!?]+(?:[.!?]+["”']?|$)/g)||[];
 const units=[];for(let sentence of sentences){sentence=sentence.trim();if(!sentence)continue;
  const pieces=sentence.split(/(?<=,)\s+|\s+(?=(?:and|but)\s+(?:I|we|you|they|he|she|it|the|this|that|then|especially)\b)|\s+(?=because\s+(?:I|we|you|they)\b)/i);let current='';
  for(const piece of pieces){if(current&&(`${current} ${piece}`).split(/\s+/).length>18){units.push(current);current=piece}else current+=(current?' ':'')+piece}
  if(current)units.push(current);
 }
 // Fragments such as "Yeah." stay with adjacent speech, rather than becoming a lesson.
 const merged=[];for(const unit of units){if(unit.split(/\s+/).length<4&&merged.length)merged[merged.length-1]+=' '+unit;else merged.push(unit)}
 return merged;
}
export function makeLesson(cues,{id,title='선택한 영상',timing='captions'}={}){
 const chunks=[];const spans=[];let combined='';
 for(let i=0;i<cues.length;i++){
  const cue=cues[i],clean=String(cue.text||'').replace(/\s+/g,' ').trim();if(!clean)continue;
  if(combined)combined+=' ';const offset=combined.length;combined+=clean;
  const next=Number(cues[i+1]?.start);const declared=Number(cue.end)||next||cue.start+5;
  const end=next>cue.start?Math.min(declared,next):declared;
  spans.push({from:offset,to:combined.length,start:cue.start,end});
 }
 let cursor=0;for(const en of splitSpeech(combined)){
  const from=combined.indexOf(en,cursor);if(from<0)throw Error('대본의 문장 경계를 확인하지 못했어요.');const to=from+en.length;cursor=to;
  const overlapping=spans.filter(c=>c.to>from&&c.from<to);if(!overlapping.length)continue;
  chunks.push({en,start:overlapping[0].start,end:overlapping.at(-1).end,timing});
 }
 if(!chunks.length)throw Error('영어 대본이 비어 있어요.');
 if(chunks.length>2000)throw Error('대본이 너무 길어요. 영상을 나눠 넣어주세요.');
 const groups=[];for(let i=0;i<chunks.length;){let n=Math.min(4,chunks.length-i);if(chunks.length-i===5)n=5;if(chunks.length-i===6)n=3;groups.push({lines:chunks.slice(i,i+n)});i+=n}
 return {id,title,timing,segments:groups};
}
export function parseTranscript(text){
 if(text.length>250000)throw Error('대본이 너무 길어요.');
 const timestamp=/\((?:(\d+):)?(\d{1,2}):(\d{2})\)\s*/g;const matches=[...text.matchAll(timestamp)];
 if(matches.length)return matches.map((m,i)=>({start:Number(m[1]||0)*3600+Number(m[2])*60+Number(m[3]),text:text.slice(m.index+m[0].length,matches[i+1]?.index||text.length).trim()}));
 // Also accept WebVTT / SRT, with their actual cue ranges.
 const cues=[];const pattern=/(\d{2}):(\d{2}):(\d{2})[.,](\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})[.,](\d{3})[^\n]*\n([\s\S]*?)(?=\n\s*\n|$)/g;
 for(const m of text.matchAll(pattern))cues.push({start:+m[1]*3600+ +m[2]*60+ +m[3]+ +m[4]/1000,end:+m[5]*3600+ +m[6]*60+ +m[7]+ +m[8]/1000,text:m[9].replace(/<[^>]+>/g,'').replace(/\n/g,' ').trim()});
 if(cues.length)return cues;
 throw Error('원음과 연결하려면 시각이 있는 영어 대본이 필요해요. (00:00) 형식 또는 VTT·SRT 자막을 넣어주세요.');
}
