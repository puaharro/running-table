import { createServer } from "node:http";
import { createReadStream, existsSync, statSync } from "node:fs";
import { extname, isAbsolute, join, relative, resolve } from "node:path";
const root = resolve("out");
if (!existsSync(join(root,"index.html"))) throw new Error("Run npm run build before starting the static preview.");
const mime = {".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".json":"application/json; charset=utf-8",".svg":"image/svg+xml",".png":"image/png",".ico":"image/x-icon",".txt":"text/plain; charset=utf-8",".xml":"application/xml; charset=utf-8",".woff2":"font/woff2"};
const server = createServer((req,res)=>{
  if(!["GET","HEAD"].includes(req.method??"")){res.writeHead(405,{Allow:"GET, HEAD"}).end();return;}
  let file;
  try {
    const pathname=decodeURIComponent(new URL(req.url??"/","http://localhost").pathname);
    file=resolve(root,`.${pathname}`);
    const rel=relative(root,file);
    if(rel.startsWith("..")||isAbsolute(rel)){res.writeHead(403).end();return;}
    if(existsSync(file)&&statSync(file).isDirectory()) file=join(file,"index.html");
  }catch {res.writeHead(400).end();return;}
  let status=200;
  if(!existsSync(file)||!statSync(file).isFile()){file=join(root,"404.html");status=404;}
  if(!existsSync(file)){res.writeHead(404).end();return;}
  res.writeHead(status,{"Content-Type":mime[extname(file)]??"application/octet-stream","Cache-Control":"no-store","X-Content-Type-Options":"nosniff"});
  if(req.method==="HEAD"){res.end();return;}
  createReadStream(file).on("error",()=>res.destroy()).pipe(res);
});
server.listen(Number(process.env.PORT??3000),"127.0.0.1",()=>console.log(`Local: http://127.0.0.1:${server.address().port}`));
