import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve, join, relative } from "node:path";
const root = resolve("out");
const files = [];
function visit(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const file = join(dir, entry.name);
    if (entry.isDirectory()) visit(file);
    else if (file.endsWith(".html")) files.push(file);
  }
}
if (!existsSync(root)) throw new Error("Build the site before checking exported pages.");
visit(root);
const errors = [];
const indexable = process.env.SITE_INDEXABLE === "true";
let links = 0;
for (const file of files) {
  const html = readFileSync(file, "utf8");
  if (!/<html[^>]*lang="zh-HK"/.test(html)) errors.push(`${file}: missing zh-HK language`);
  if (!indexable && !/<meta name="robots" content="[^"]*noindex/.test(html))
    errors.push(`${file}: staging must be noindex`);
  if (/海濱晨光路跑|河畔十公里挑戰|城市一哩跑步日|虛構示範資料/.test(html))
    errors.push(`${file}: fixture data leaked into real catalog output`);
  if (!html.includes("報名狀態只對應所列渠道"))
    errors.push(`${file}: missing registration scope disclosure`);
  if (
    /^races\/\d{4}\/[^/]+\/index\.html$/.test(relative(root, file).replaceAll("\\", "/")) &&
    !html.includes("資料來源及核實範圍")
  )
    errors.push(`${file}: missing race provenance`);
  for (const match of html.matchAll(/(?:href|src)="([^"#]+)"/g)) {
    const href = match[1].replaceAll("&amp;", "&");
    if (!href.startsWith("/") || href.startsWith("//")) continue;
    const pathname = decodeURIComponent(href.split(/[?#]/)[0]);
    if (!pathname) continue;
    const target = join(root, pathname);
    if (!existsSync(target) && !existsSync(join(target, "index.html")))
      errors.push(`${file}: missing ${pathname}`);
    links++;
  }
  if (/pagead2\.googlesyndication\.com|googletagmanager\.com/.test(html))
    errors.push(`${file}: prototype unexpectedly loads advertising or analytics`);
}
if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log(
  `Export verified: ${files.length} HTML pages, ${links} internal references, source disclosure and ${indexable ? "public" : "staging noindex"} output; no fixture or advertising scripts.`,
);
