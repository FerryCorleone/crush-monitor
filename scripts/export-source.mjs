import { cp, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { parse } from 'dotenv';
const root = resolve(import.meta.dirname, '..');
const out = join(root, 'artifacts', `source-${Date.now()}`, 'crush-monitor');
await mkdir(out, {recursive:true});
// Allowlist: never export local docs, credentials, screenshots, runtime logs or git history.
for (const name of ['src','shared','server','tests','public','README.md','README.en.md','LICENSE','package.json','package-lock.json','tsconfig.json','vite.config.ts','index.html','.gitignore','.env.example']) {
  await cp(join(root,name), join(out,name), {recursive:true});
}
await mkdir(join(out,'scripts'));
for (const name of ['setup.ts','check-api.ts','check-live.ts','export-source.mjs']) await cp(join(root,'scripts',name),join(out,'scripts',name));
const env = await readFile(join(root,'.env'),'utf8').catch(()=>'');
const keys = ['JEV_API_KEY', 'TYPESAFE_API_KEY', 'AI_GATEWAY_API_KEY', 'OPENROUTER_API_KEY'];
const secrets = keys.flatMap(key => [parse(env)[key], process.env[key]]).filter(v=>v && v.length>8);
let count=0;
async function audit(dir) {
  for (const entry of await readdir(dir,{withFileTypes:true})) {
    const path=join(dir,entry.name);
    if(entry.isDirectory()) { await audit(path); continue; }
    const data=await readFile(path,'utf8');
    if (secrets.some(secret=>data.includes(secret)) || (process.env.HOME && process.env.HOME !== '/' && data.includes(process.env.HOME))) throw new Error('Export blocked: private content found in '+entry.name);
    count++;
  }
}
await audit(out);
await writeFile(join(root,'artifacts','latest-source-path.txt'),out+'\n');
console.log(`Source export checked: ${count} files\n${out}`);
