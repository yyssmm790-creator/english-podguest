// Shared response validation. Contains no provider configuration or credentials.
export function normalizeStoryResult(value) {
 const object=v=>v && typeof v==='object' && !Array.isArray(v);
 const string=(v,max)=>typeof v==='string' && v.trim().length>0 && v.length<=max;
 const line=v=>object(v) && string(v.en,360) && string(v.ko,360);
 if(!object(value) || !string(value.title,80) || !Array.isArray(value.levels) || value.levels.length!==3)throw new Error('invalid_story_result');
 const seen=new Set();
 const levels=value.levels.map(item=>{
  if(!object(item) || ![1,2,3].includes(item.level) || seen.has(item.level))throw new Error('invalid_story_result');
  seen.add(item.level);
  if(!Array.isArray(item.podcast) || item.podcast.length<1 || item.podcast.length>8 || !item.podcast.every(line))throw new Error('invalid_story_result');
  if(!Array.isArray(item.dialogue) || item.dialogue.length<1 || item.dialogue.length>6 || !item.dialogue.every(turn=>object(turn) && line(turn.question) && line(turn.answer)) || !line(item.closing))throw new Error('invalid_story_result');
  const clean=v=>({en:v.en.trim(),ko:v.ko.trim()});
  return {level:item.level,podcast:item.podcast.map(clean),dialogue:item.dialogue.map(turn=>({question:clean(turn.question),answer:clean(turn.answer)})),closing:clean(item.closing)};
 });
 return {title:value.title.trim(),levels:levels.sort((a,b)=>a.level-b.level)};
}
