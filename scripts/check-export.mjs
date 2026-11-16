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
  const path = relative(root, file).replaceAll("\\", "/");
  const english = path.startsWith("en/");
  const language = english ? "en" : "zh-HK";
  if (!new RegExp(`<html[^>]*lang="${language}"`).test(html))
    errors.push(`${file}: missing ${language} language`);
  if (path.endsWith("index.html") && !/^(?:404|_not-found)\//.test(path)) {
    const alternate = english
      ? `/${path.slice(3, -"index.html".length)}`
      : `/en/${path.slice(0, -"index.html".length)}`;
    if (!new RegExp(`<a[^>]*class="site-language"[^>]*href="${alternate}"`).test(html))
      errors.push(`${file}: missing matching language switch to ${alternate}`);
  }
  if (!indexable && !/<meta name="robots" content="[^"]*noindex/.test(html))
    errors.push(`${file}: staging must be noindex`);
  if (/海濱晨光路跑|河畔十公里挑戰|城市一哩跑步日|虛構示範資料/.test(html))
    errors.push(`${file}: fixture data leaked into real catalog output`);
  if (
    !html.includes(
      english
        ? "Registration status applies only to the listed entry channels"
        : "報名狀態只對應所列渠道",
    )
  )
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
for (const [page, parts] of [
  ["index.html", ["focus-banner-slide", "home-review-photo", "home-guide-grid", "home-news-sheet"]],
  [
    "races/index.html",
    ["calendar-race-card", "calendar-row-head", "calendar-filter-panel", "race-pagination"],
  ],
]) {
  const versions = ["", "en"].map((locale) => readFileSync(join(root, locale, page), "utf8"));
  for (const part of parts) {
    const counts = versions.map(
      (html) =>
        [...html.matchAll(/class="([^"]+)"/g)].filter((match) => match[1].split(" ").includes(part))
          .length,
    );
    if (!counts[0] || counts[0] !== counts[1])
      errors.push(`${page}: Chinese and English views differ in ${part}`);
  }
}
const sampleRace = "races/2027/schkm-youth-2027";
const englishRace = readFileSync(join(root, "en", sampleRace, "index.html"), "utf8");
for (const label of [
  "Race overview",
  "Eligibility and conditions",
  "Race experience",
  "10 to 15",
  "Download PDF",
]) {
  if (!englishRace.includes(label)) errors.push(`English race page is missing: ${label}`);
}
const englishPdf = join(root, "en", sampleRace, "race-day.pdf");
if (
  !existsSync(englishPdf) ||
  !readFileSync(englishPdf).subarray(0, 5).equals(Buffer.from("%PDF-"))
) {
  errors.push("English race-day PDF is missing or invalid");
}
if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log(
  `Export verified: ${files.length} HTML pages, ${links} internal references, source disclosure and ${indexable ? "public" : "staging noindex"} output; no fixture or advertising scripts.`,
);
