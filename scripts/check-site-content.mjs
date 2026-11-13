import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { checkContent, contentTargets } from "./site-qa/content.mjs";

export function options(args) {
  if (args.includes("--help")) return null;
  const result = {};
  while (args.length) {
    const flag = args.shift();
    if (
      !["--directory", "--base-url"].includes(flag) ||
      !args[0] ||
      args[0].startsWith("--") ||
      result[flag]
    )
      throw new Error("Use --directory PATH or --base-url URL (one mode only).");
    result[flag] = args.shift();
  }
  if (result["--directory"] && result["--base-url"]) throw new Error("Choose one mode only.");
  if (result["--base-url"]) {
    const url = new URL(result["--base-url"]);
    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      url.pathname !== "/"
    )
      throw new Error("Use an HTTP(S) origin without credentials, path, query or fragment.");
    return { base: url.origin };
  }
  return { directory: resolve(result["--directory"] ?? "out") };
}

export async function run(args) {
  const config = options([...args]);
  if (!config) {
    console.log(
      "Read-only confirmed content check (currently two selected 2025 experiences).\n  npm run check:content -- --directory out\n  npm run check:content -- --base-url http://127.0.0.1:3000\nNo build, browser login, approval, file writes or deployment. HTTP login/redirect/errors fail; use an authenticated browser for gated Sites.",
    );
    return;
  }
  let failed = false;
  for (const target of contentTargets()) {
    try {
      let html;
      if (config.base) {
        const response = await fetch(new URL(target.urlPath, config.base), {
          redirect: "error",
          signal: AbortSignal.timeout(15000),
        });
        if (response.status !== 200)
          throw new Error(
            `HTTP ${response.status}; content not verified (login/access may be required)`,
          );
        html = await response.text();
      } else html = await readFile(resolve(config.directory, target.path), "utf8");
      const result = checkContent(html, target.record);
      console.log(
        `PASS ${result.raceId}: copy v${result.copyRevision}, rating v${result.ratingRevision}; ${result.scores.map((v) => v ?? "未評").join(" / ")}; five topics, complete wording, sources and limitations match.`,
      );
    } catch (error) {
      failed = true;
      console.error(`FAIL ${target.raceId}: ${error.message.split("\n")[0]}`);
    }
  }
  if (failed)
    throw new Error("Content verification incomplete/failed. This is not approval to publish.");
  console.log(
    "Content matches the selected revisions; browser behaviour, archive privacy and publication approval remain separate checks.",
  );
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  run(process.argv.slice(2)).catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
