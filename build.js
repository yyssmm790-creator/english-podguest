import { readFile, writeFile } from 'node:fs/promises';
let html = await readFile('public/index.template.html', 'utf8');
const css = await readFile('public/style.css', 'utf8') + '\n' + await readFile('public/orb.css', 'utf8') + '\n' + await readFile('public/diary.css', 'utf8') + '\n' + await readFile('public/blue-study.css', 'utf8');
const script = (await readFile('public/voices.js', 'utf8')).replace('export const', 'const') + '\n' + (await readFile('public/voice-turn.js', 'utf8')).replace('export class', 'class') + '\n' + (await readFile('public/diary.js', 'utf8')).replace('export class', 'class') + '\n' + await readFile('public/music-tracks.js', 'utf8') + '\n' + (await readFile('public/story-data.js', 'utf8')).replace('export function','function') + '\n' + await readFile('public/example-levels.js', 'utf8') + '\n' + await readFile('public/app.js', 'utf8');
html = html.replace('@@STYLES@@', () => css).replace('@@SCRIPT@@', () => script);
html=html.replace('@@MUSIC@@',()=> './audio/cafe-acoustic-01.mp3');
await writeFile('public/legacy-studio.html', html);
console.log('Backed up the previous studio at public/legacy-studio.html');

const approved=await readFile('design/integrated-preview.html','utf8');
await writeFile('public/approved-preview.html',approved);
await writeFile('public/index.html',approved);
console.log('Built the user-approved My-Podguest homepage.');

const marker='data:image/png;base64,';
const start=approved.indexOf(marker);
if(start!==-1){const tail=approved.slice(start+marker.length);const encoded=tail.split(')')[0];await writeFile('public/my-podguest-share.png',Buffer.from(encoded,'base64'));}

/* Generate matching blue microphone icons for iOS home-screen bookmarks. */
const { deflateSync } = await import('node:zlib');
const crcTable=Array.from({length:256},(_,n)=>{for(let k=0;k<8;k++)n=n&1?0xedb88320^(n>>>1):n>>>1;return n>>>0});
function pngChunk(type,data){const name=Buffer.from(type),size=Buffer.alloc(4),crc=Buffer.alloc(4);size.writeUInt32BE(data.length);let n=0xffffffff;for(const b of Buffer.concat([name,data]))n=crcTable[(n^b)&255]^(n>>>8);crc.writeUInt32BE((n^0xffffffff)>>>0);return Buffer.concat([size,name,data,crc])}
function makeMicIcon(size){const raw=Buffer.alloc(size*(size*4+1));const scale=size/512;for(let y=0;y<size;y++){let row=y*(size*4+1);raw[row]=0;for(let x=0;x<size;x++){let X=x/scale,Y=y/scale;let radius=Math.min(X,512-X,Y,512-Y);let inBody=(X>=207&&X<=305&&Y>=113&&Y<=314&&((Y>=160&&Y<=266)||((X-256)**2/49**2+(Y-160)**2/47**2<=1)||((X-256)**2/49**2+(Y-266)**2/48**2<=1)));let arc=(X-256)**2/100**2+(Y-272)**2/107**2;let inArc=(arc>=.82&&arc<=1.12&&Y>=263&&Y<=380);let stem=(X>=246&&X<=266&&Y>=369&&Y<=423);let foot=(X>=199&&X<=313&&Y>=415&&Y<=431);let white=inBody||inArc||stem||foot;let p=row+1+x*4;let t=Math.min(1,Math.max(0,(X+Y)/900));raw[p]=white?255:Math.round(30-20*t);raw[p+1]=white?255:Math.round(161-78*t);raw[p+2]=white?255:Math.round(255-18*t);raw[p+3]=radius<64&&((X<64&&Y<64&&(X-64)**2+(Y-64)**2>64**2)||(X>448&&Y<64&&(X-448)**2+(Y-64)**2>64**2)||(X<64&&Y>448&&(X-64)**2+(Y-448)**2>64**2)||(X>448&&Y>448&&(X-448)**2+(Y-448)**2>64**2))?0:255;}}const sig=Buffer.from([137,80,78,71,13,10,26,10]);const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(size,0);ihdr.writeUInt32BE(size,4);ihdr[8]=8;ihdr[9]=6;return Buffer.concat([sig,pngChunk('IHDR',ihdr),pngChunk('IDAT',deflateSync(raw)),pngChunk('IEND',Buffer.alloc(0))])}
await writeFile('public/my-podguest-icon-180.png',makeMicIcon(180));
await writeFile('public/my-podguest-icon-192.png',makeMicIcon(192));
await writeFile('public/my-podguest-icon-512.png',makeMicIcon(512));
