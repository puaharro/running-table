import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  checkContent,
  contentTargets,
  checkRuntimeRunnerCopy,
  englishRunnerTopics,
} from "./site-qa/content.mjs";
import { runtimeTargets } from "./site-qa/runtime-targets.mjs";

export function options(args) {
  if (args.includes("--help")) return null;
  const result = {};
  while (args.length) {
    const flag = args.shift();
    if (
      !["--directory", "--base-url", "--race", "--year", "--group", "--revision"].includes(flag) ||
      !args[0] ||
      args[0].startsWith("--") ||
      result[flag]
    )
      throw new Error("Use --directory PATH or --base-url URL (one mode only).");
    result[flag] = args.shift();
  }
  const selection = ["--race", "--year", "--group", "--revision"].map((key) => result[key]);
  const [raceId, year, groupId, revision] = selection;
  const target = selection.some(Boolean)
    ? { raceId, year: Number(year), groupId, revision: Number(revision) }
    : undefined;
  if (
    target &&
    (!selection.every(Boolean) || !/^\d{4}$/.test(year) || !/^[1-9]\d*$/.test(revision))
  )
    throw Error("Specify --race ID --year YYYY --group ID --revision N together.");
  const scoped = target ? { target } : {};
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
    return { base: url.origin, ...scoped };
  }
  return { directory: resolve(result["--directory"] ?? "out"), ...scoped };
}

export async function run(args) {
  const config = options([...args]);
  if (!config) {
    console.log(
      "Read-only content check. Options: --directory PATH or --base-url URL. Target a selected CMS copy with --race ID --year YYYY --group ID --revision N. Without a target, check the two historical experiences.",
    );
    return;
  }
  async function loadPage(urlPath) {
    if (config.base) {
      const response = await fetch(new URL(urlPath, config.base), {
        redirect: "error",
        signal: AbortSignal.timeout(15000),
      });
      if (response.status !== 200) throw Error(`HTTP ${response.status}; content not verified`);
      return response.text();
    }
    return readFile(resolve(config.directory, urlPath.slice(1), "index.html"), "utf8");
  }
  if (config.target) {
    const { raceId, year, groupId, revision } = config.target;
    const target = runtimeTargets().find(
      (entry) =>
        entry.raceId === raceId &&
        entry.year === year &&
        entry.groupId === groupId &&
        entry.copy.revision === revision,
    );
    if (!target)
      throw Error("No selected CMS copy matches this race, edition, group and revision.");
    for (const locale of ["", "en"]) {
      const path = locale ? "/en" + target.urlPath : target.urlPath;
      checkRuntimeRunnerCopy(
        await loadPage(path),
        target.copy,
        locale ? englishRunnerTopics : undefined,
        target,
      );
    }
    console.log(`PASS ${raceId} · ${year} · ${groupId} · v${revision} (ZH/EN)`);
    return;
  }
  let failed = false;
  for (const target of contentTargets()) {
    try {
      const html = await loadPage(target.urlPath);
      const result = checkContent(html, target.record);
      console.log(
        `PASS ${result.raceId}: copy v${result.copyRevision}, review v${result.ratingRevision}; five topics, complete wording, sources and limitations match.`,
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
