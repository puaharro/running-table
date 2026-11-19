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
const raceRoutes = { zh: new Set(), en: new Set() };
const origin = process.env.NEXT_PUBLIC_SITE_URL;
const indexablePages = new Map();
const tagPatterns = {
  meta: /<meta\b[^>]*>/g,
  link: /<link\b[^>]*>/g,
  "xhtml:link": /<xhtml:link\b[^>]*>/g,
};
function languageUrls(path) {
  const chinese = path.startsWith("/en/") ? path.slice(3) : path;
  return {
    "zh-HK": new URL(chinese, origin).href,
    en: new URL(`/en${chinese}`, origin).href,
  };
}
function tagsWithAttribute(markup, tagName, attribute, value) {
  return [...markup.matchAll(tagPatterns[tagName])]
    .map(([tag]) =>
      Object.fromEntries(
        [...tag.matchAll(/([\w:-]+)="([^"]*)"/g)].map(([, name, value]) => [
          name.toLowerCase(),
          value,
        ]),
      ),
    )
    .filter((attributes) => attributes[attribute] === value);
}
if (indexable && !origin)
  throw new Error("NEXT_PUBLIC_SITE_URL is required to check the indexable export.");

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
  const raceMatch = /^(?:en\/)?races\/\d{4}\/[^/]+\/index\.html$/.test(path);
  if (raceMatch) raceRoutes[english ? "en" : "zh"].add(`/${path.slice(0, -"index.html".length)}`);
  if (indexable && path.endsWith("index.html") && !/^(?:404|_not-found)\//.test(path)) {
    const pathname = `/${path.slice(0, -"index.html".length)}`;
    const url = new URL(pathname, origin).href;
    const head = html.slice(0, html.indexOf("</head>"));
    const robots = tagsWithAttribute(head, "meta", "name", "robots");
    const noindex = robots.some(({ content }) => /(?:^|[ ,])noindex(?:$|[ ,])/.test(content ?? ""));
    const utilityPage = /^\/(?:en\/)?ratings\/(feedback|notebook)\/$/.test(pathname);
    if (noindex !== utilityPage) errors.push(`${pathname}: unexpected index policy`);
    const canonicals = tagsWithAttribute(head, "link", "rel", "canonical");
    if (canonicals.length !== 1 || canonicals[0].href !== url)
      errors.push(`${pathname}: expected canonical ${url}`);
    if (!utilityPage) {
      const alternates = languageUrls(pathname);
      indexablePages.set(url, alternates);
      for (const [lang, href] of Object.entries(alternates)) {
        const matches = tagsWithAttribute(head, "link", "hreflang", lang);
        if (matches.length !== 1 || matches[0].rel !== "alternate" || matches[0].href !== href)
          errors.push(`${pathname}: expected ${lang} alternate ${href}`);
      }
    }
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
    raceMatch &&
    !html.includes(english ? "Sources and scope of verification" : "資料來源及核實範圍")
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
for (const [locale, routes] of Object.entries(raceRoutes)) {
  const calendar = readFileSync(
    join(root, locale === "en" ? "en" : "", "races", "index.html"),
    "utf8",
  );
  const directory = /<details[^>]*id="race-directory"[^>]*>([\s\S]*?)<\/details>/.exec(
    calendar,
  )?.[1];
  if (!directory || !calendar.includes('href="#race-directory"'))
    errors.push(`${locale}: missing calendar directory or its entry link`);
  for (const route of routes) {
    if (!directory?.includes(`href="${route}"`))
      errors.push(`${locale}: missing directory link to ${route}`);
  }
}

if (indexable) {
  const robots = readFileSync(join(root, "robots.txt"), "utf8");
  if (!robots.split(/\r?\n/).includes(`Sitemap: ${new URL("/sitemap.xml", origin).href}`))
    errors.push("robots.txt: missing the public sitemap URL");
  const sitemap = readFileSync(join(root, "sitemap.xml"), "utf8");
  const seen = new Set();
  for (const [, entry] of sitemap.matchAll(/<url>([\s\S]*?)<\/url>/g)) {
    const url = /<loc>([^<]+)<\/loc>/.exec(entry)?.[1];
    const alternates = indexablePages.get(url);
    if (!alternates || seen.has(url)) {
      errors.push(`sitemap.xml: unexpected or duplicate URL ${url}`);
      continue;
    }
    seen.add(url);
    for (const [lang, href] of Object.entries(alternates)) {
      const matches = tagsWithAttribute(entry, "xhtml:link", "hreflang", lang);
      if (
        !indexablePages.has(href) ||
        matches.length !== 1 ||
        matches[0].href !== href ||
        matches[0].rel !== "alternate"
      )
        errors.push(`sitemap.xml: ${url} has an invalid ${lang} alternate`);
    }
  }
  for (const url of indexablePages.keys()) {
    if (!seen.has(url)) errors.push(`sitemap.xml: missing ${url}`);
  }
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
for (const [slug, distance] of [
  ["choose-your-first-10k", "10K"],
  ["compare-half-marathons", "半馬"],
]) {
  const guidePath = `guides/${slug}/`;
  const racePaths = ["", "/en"].map((locale) => {
    const html = readFileSync(join(root, `.${locale}`, guidePath, "index.html"), "utf8");
    const calendarHref = `${locale}/races/?distance=${encodeURIComponent(distance)}#race-list`;
    if (!html.includes(`href="${calendarHref}"`))
      errors.push(`Missing distance-filtered calendar link: ${locale}/${guidePath}`);
    const relatedRaces = [...html.matchAll(/class="guides-race-card" href="([^"#?]+)"/g)].map(
      ([, href]) => href.slice(locale.length),
    );
    for (const racePath of relatedRaces) {
      const race = readFileSync(join(root, `.${locale}`, `.${racePath}`, "index.html"), "utf8");
      if (!race.includes(`href="${locale}/${guidePath}"`))
        errors.push(`Missing reciprocal guide link: ${locale}${racePath} -> ${guidePath}`);
    }
    return relatedRaces;
  });
  if (JSON.stringify(racePaths[0]) !== JSON.stringify(racePaths[1]))
    errors.push(`Chinese and English related races differ: ${guidePath}`);
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
