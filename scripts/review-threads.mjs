import { parseArgs } from "node:util";
import { readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { privatePath } from "./inspect-threads.mjs";
import { cleanReport, cleaningDemo } from "./threads/clean.mjs";
import { ReviewStore } from "./threads/review-store.mjs";
import { startReviewServer } from "./threads/review-server.mjs";

const HELP = `Threads private manual review (Node.js 24+; no scoring)
  npm run review:threads -- --demo
  npm run review:threads -- --input .editorial-private/threads/cleaned/RESULT.json

Choose --demo OR --input FILE (clean:threads JSON).
  --review-db FILE  Separate private SQLite for decisions and history
  --port N          Localhost port (default 3330; 0 chooses a free port)
  --help            Show usage
Demo persists independently and resumes its existing source on restart.
All inputs/databases stay inside this repo's .editorial-private/.\n`;
export function parseReviewOptions(args) {
  const { values } = parseArgs({
    args,
    options: {
      demo: { type: "boolean" },
      input: { type: "string" },
      "review-db": { type: "string" },
      port: { type: "string" },
      help: { type: "boolean" },
    },
  });
  if (values.help) return { help: true };
  if (Boolean(values.demo) === Boolean(values.input))
    throw new Error("Choose --demo or --input FILE.");
  const port = Number(values.port ?? 3330);
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error("Invalid port.");
  const defaultDb = fileURLToPath(
    new URL(
      `../.editorial-private/threads/reviews/${values.demo ? "demo" : "manual"}.sqlite`,
      import.meta.url,
    ),
  );
  const reviewDb = privatePath(values["review-db"] ?? defaultDb),
    input = values.input ? privatePath(values.input) : null;
  if (input === reviewDb) throw new Error("Source and review database must be separate.");
  return { demo: values.demo, input, reviewDb, port };
}
export async function main(args = process.argv.slice(2)) {
  let store;
  try {
    const options = parseReviewOptions(args);
    if (options.help) {
      console.log(HELP);
      return 0;
    }
    // Parse supplied evidence before creating a review database.
    let source = options.input
      ? JSON.parse(readFileSync(options.input, "utf8").replace(/^\uFEFF/, ""))
      : null;
    store = new ReviewStore(options.reviewDb);
    if (options.demo)
      source = store.latestDemo() ?? cleanReport(await cleaningDemo(), "hk-marathon");
    const datasetId = store.register(source);
    const { server, url } = await startReviewServer({ store, datasetId, port: options.port });
    const activeStore = store;
    store = undefined;
    const stop = () => server.close();
    process.once("SIGINT", stop);
    process.once("SIGTERM", stop);
    server.once("close", () => {
      process.removeListener("SIGINT", stop);
      process.removeListener("SIGTERM", stop);
      activeStore.close();
    });
    console.log(
      JSON.stringify(
        { mode: source.mode, dataset_id: datasetId, review_db: options.reviewDb, url },
        null,
        2,
      ),
    );
    return 0;
  } catch {
    console.error(
      "Review could not start. Check --help, the private cleaned JSON, separate review database and available port.",
    );
    return 2;
  } finally {
    store?.close();
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href)
  process.exitCode = await main();
