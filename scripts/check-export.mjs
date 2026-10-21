import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve, join } from "node:path";
const root=resolve("out");
const files=[];
function visit(dir){for(const entry of readdirSync(dir,{withFileTypes:true})){const file=join(dir,entry.name);if(entry.isDirectory())visit(file);else if(file.endsWith(".html"))files.push(file);}}
if(!existsSync(root))throw new Error("Build the site before checking exported pages.");
visit(root);
const errors=[];
let links=0;
for(const file of files){
  const html=readFileSync(file,"utf8");
  if(!/<html[^>]*lang="zh-HK"/.test(html))errors.push(`${file}: missing zh-HK language`);
  if(!/<meta name="robots" content="[^"]*noindex/.test(html))errors.push(`${file}: prototype must be noindex`);
  if(!html.includes("虛構示範資料"))errors.push(`${file}: missing global demo disclosure`);
  for(const match of html.matchAll(/(?:href|src)="([^"#]+)"/g)){
    const href=match[1].replaceAll("&amp;","&");
    if(!href.startsWith("/")||href.startsWith("//"))continue;
    const pathname=decodeURIComponent(href.split(/[?#]/)[0]);
    if(!pathname)continue;
    const target=join(root,pathname);
    if(!existsSync(target)&&!existsSync(join(target,"index.html")))errors.push(`${file}: missing ${pathname}`);
    links++;
  }
  if(/pagead2\.googlesyndication\.com|googletagmanager\.com/.test(html))errors.push(`${file}: prototype unexpectedly loads advertising or analytics`);
}
if(errors.length){console.error(errors.join("\n"));process.exit(1);}
console.log(`Export verified: ${files.length} HTML pages, ${links} internal page/asset references, noindex and prototype disclosures present.`);
