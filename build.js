import { readFile, writeFile } from 'node:fs/promises';
let html = await readFile('public/index.template.html', 'utf8');
const css = await readFile('public/style.css', 'utf8') + '\n' + await readFile('public/orb.css', 'utf8') + '\n' + await readFile('public/diary.css', 'utf8');
const script = (await readFile('public/voices.js', 'utf8')).replace('export const', 'const') + '\n' + (await readFile('public/voice-turn.js', 'utf8')).replace('export class', 'class') + '\n' + (await readFile('public/diary.js', 'utf8')).replace('export class', 'class') + '\n' + await readFile('public/music-tracks.js', 'utf8') + '\n' + (await readFile('public/story-data.js', 'utf8')).replace('export function','function') + '\n' + await readFile('public/example-levels.js', 'utf8') + '\n' + await readFile('public/app.js', 'utf8');
html = html.replace('@@STYLES@@', () => css).replace('@@SCRIPT@@', () => script);
html=html.replace('@@MUSIC@@',()=> './audio/cafe-acoustic-01.mp3');
await writeFile('public/index.html', html);
console.log('Built self-contained studio: public/index.html');
