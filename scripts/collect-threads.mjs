import { parseArgs } from "node:util";
import {
  existsSync,
  readFileSync,
  mkdirSync,
  openSync,
  writeFileSync,
  closeSync,
  unlinkSync,
} from "node:fs";
import { dirname, resolve, relative, isAbsolute } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { ThreadsClient, CollectorError } from "./threads/client.mjs";
import { Store } from "./threads/store.mjs";
import { collect } from "./threads/collector.mjs";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const PRIVATE = resolve(ROOT, ".editorial-private");
class UsageError extends Error {}
export const HELP = `Threads Collector V0.1 (Node.js 24+)
  npm run collect:threads -- --race "Hong Kong Marathon" --year 2027 --keywords-file docs/examples/threads-hong-kong-marathon.json
  npm run collect:threads -- --resume RUN_ID
  npm run collect:threads -- --status RUN_ID

Options:
  --race NAME            Race label (required for a new run)
  --year YYYY            Target edition label; NOT an inferred event year or date filter
  --keyword TEXT         Repeat for multilingual keywords; defaults to the race name
  --keywords-file FILE   JSON array of keywords; combined with --keyword
  --search-type TYPE     RECENT (default) or TOP
  --page-size N          1..100 (default 100)
  --db FILE              SQLite file inside this repo's .editorial-private/
  --resume RUN_ID        Continue unfinished tasks using stored keywords/settings
  --status RUN_ID        Show stored counts without an API request or token
  --help                Show usage

Set THREADS_ACCESS_TOKEN in the environment or this repo's ignored .env.local.
Data is private. No classification, scoring, publishing or full-platform coverage claim.
`;

export function parseOptions(args) {
  const { values } = parseArgs({
    args,
    options: {
      race: { type: "string" },
      year: { type: "string" },
      keyword: { type: "string", multiple: true },
      "keywords-file": { type: "string" },
      "search-type": { type: "string" },
      "page-size": { type: "string" },
      db: { type: "string" },
      resume: { type: "string" },
      status: { type: "string" },
      help: { type: "boolean" },
    },
  });
  if (values.help) return { help: true };
  if (values.resume && values.status) throw new UsageError("Use --resume or --status, not both.");
  const existing = values.resume || values.status;
  if (
    existing &&
    ["race", "year", "keyword", "keywords-file", "search-type", "page-size"].some(
      (key) => values[key] !== undefined,
    )
  ) {
    throw new UsageError(
      "Resume/status uses stored settings; omit race, year, keywords and search options.",
    );
  }
  if (
    !existing &&
    (!values.race?.trim() ||
      !/^\d{4}$/.test(values.year ?? "") ||
      Number(values.year) < 1900 ||
      Number(values.year) > 2200)
  ) {
    throw new UsageError("A new run requires --race NAME and --year YYYY (1900..2200).");
  }
  const pageSize = Number(values["page-size"] ?? 100),
    searchType = values["search-type"] ?? "RECENT";
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100)
    throw new UsageError("Page size must be 1..100.");
  if (!["RECENT", "TOP"].includes(searchType))
    throw new UsageError("Search type must be RECENT or TOP.");
  let keywords = values.keyword ?? [];
  if (values["keywords-file"]) {
    const fileKeywords = JSON.parse(
      readFileSync(resolve(values["keywords-file"]), "utf8").replace(/^\uFEFF/, ""),
    );
    if (!Array.isArray(fileKeywords)) throw new UsageError("Keywords file must be a JSON array.");
    keywords = [...keywords, ...fileKeywords];
  }
  if (keywords.some((keyword) => typeof keyword !== "string" || !keyword.trim()))
    throw new UsageError("Keywords must be nonempty strings.");
  keywords = [...new Set(keywords.map((keyword) => keyword.trim()))];
  if (!keywords.length && !existing) keywords = [values.race.trim()];
  const db = resolve(values.db ?? resolve(PRIVATE, "threads/collector.sqlite"));
  const within = relative(PRIVATE, db);
  if (!within || within.startsWith("..") || isAbsolute(within))
    throw new UsageError("Database must be inside this repo's .editorial-private/ directory.");
  return {
    db,
    resume: values.resume,
    status: values.status,
    race: values.race?.trim(),
    year: Number(values.year),
    keywords,
    searchType,
    pageSize,
  };
}

export async function main(args = process.argv.slice(2)) {
  let store, runId, lockFd, lockPath;
  const abort = new AbortController();
  const stop = () => abort.abort();
  try {
    const options = parseOptions(args);
    if (options.help) {
      console.log(HELP);
      return 0;
    }
    const envFile = resolve(ROOT, ".env.local");
    if (existsSync(envFile)) process.loadEnvFile(envFile);
    if (!options.status && !process.env.THREADS_ACCESS_TOKEN?.trim())
      throw new CollectorError("missing_access_token");
    if ((options.resume || options.status) && !existsSync(options.db))
      throw new CollectorError("database_not_found");
    mkdirSync(dirname(options.db), { recursive: true });
    lockPath = `${options.db}.lock`;
    try {
      lockFd = openSync(lockPath, "wx");
    } catch {
      throw new CollectorError("database_locked");
    }
    writeFileSync(
      lockFd,
      JSON.stringify({ pid: process.pid, started_at: new Date().toISOString() }),
    );
    store = new Store(options.db);
    if (options.status) {
      console.log(JSON.stringify(store.summary(options.status), null, 2));
      return 0;
    }
    if (options.resume) store.run(options.resume);
    runId = options.resume ?? store.createRun(options);
    console.error(`Run: ${runId}\nDatabase: ${options.db}`);
    process.on("SIGINT", stop);
    process.on("SIGTERM", stop);
    const client = new ThreadsClient({
      token: process.env.THREADS_ACCESS_TOKEN,
      signal: abort.signal,
      onError: (error) => store.error(runId, error),
    });
    const summary = await collect({
      store,
      runId,
      client,
      signal: abort.signal,
      onProgress: ({ endpoint, items, more }) =>
        console.error(`${endpoint}: ${items} items; ${more ? "next page" : "end"}`),
    });
    console.log(JSON.stringify(summary, null, 2));
    return summary.status === "complete" ? 0 : 2;
  } catch (error) {
    // Unknown exceptions may contain response bodies or credentials: never print them.
    console.error(
      abort.signal.aborted
        ? "Collection interrupted; resume the run above."
        : error instanceof CollectorError || error instanceof UsageError
          ? error.message
          : "Collection failed. Check arguments with --help and local database/files.",
    );
    if (store && runId) console.log(JSON.stringify(store.summary(runId), null, 2));
    return abort.signal.aborted ? 130 : 2;
  } finally {
    process.removeListener("SIGINT", stop);
    process.removeListener("SIGTERM", stop);
    store?.close();
    if (lockFd !== undefined) {
      closeSync(lockFd);
      unlinkSync(lockPath);
    }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href)
  process.exitCode = await main();
