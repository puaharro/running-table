import { readFileSync } from "node:fs";
import { join } from "node:path";
import { checkRuntimeRunnerCopy, englishRunnerTopics } from "./site-qa/content.mjs";
import { runtimeTargets } from "./site-qa/runtime-targets.mjs";

for (const target of runtimeTargets()) {
  for (const locale of ["", "en"]) {
    const path = join("out", locale, target.urlPath.slice(1), "index.html");
    const html = readFileSync(path, "utf8");
    if (html.includes(".editorial-private")) throw Error("Private path leaked: " + path);
    checkRuntimeRunnerCopy(html, target.copy, locale ? englishRunnerTopics : undefined, target);
  }
}
console.log(
  "CMS runner accounts verified in both languages: edition, group, revision, layout and content.",
);
