import { parseArgs } from "node:util";
import { fileURLToPath, pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { privatePath } from "./inspect-threads.mjs";
import { ManualStore } from "./threads/manual-store.mjs";
import { ReviewStore } from "./threads/review-store.mjs";
import { startManualServer } from "./threads/manual-server.mjs";

const HELP = `Private Threads manual import (Node.js 24+; no token or scoring)
  npm run import:threads
  npm run import:threads -- --demo --port 3333

  --db FILE         Private manual-input SQLite (separate from collector/reviews)
  --review-db FILE  Separate private review SQLite
  --port N          Localhost port, default 3332; 0 chooses a free port
  --demo            Isolated fictional-test workspace, initially empty
  --help            Show usage
Paste text and HTTPS Threads source links in the page, then prepare cleaning/review.
No source URL is fetched. All data stays in .editorial-private/.\n`;
export function parseImportOptions(args) {
  const { values } = parseArgs({
    args,
    options: {
      db: { type: "string" },
      "review-db": { type: "string" },
      port: { type: "string" },
      demo: { type: "boolean" },
      help: { type: "boolean" },
    },
  });
  if (values.help) return { help: true };
  const port = Number(values.port ?? 3332);
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error("Invalid port.");
  const name = values.demo ? "demo" : "manual";
  const db = privatePath(
    values.db ??
      fileURLToPath(
        new URL(`../.editorial-private/threads/import/${name}.sqlite`, import.meta.url),
      ),
  );
  const reviewDb = privatePath(
    values["review-db"] ??
      fileURLToPath(
        new URL(`../.editorial-private/threads/import/${name}-reviews.sqlite`, import.meta.url),
      ),
  );
  if (db === reviewDb) throw new Error("Use separate databases.");
  return { db, reviewDb, port, mode: values.demo ? "demo" : "manual" };
}
export async function main(args = process.argv.slice(2)) {
  let store, reviews;
  try {
    const options = parseImportOptions(args);
    if (options.help) {
      console.log(HELP);
      return 0;
    }
    store = new ManualStore(options.db, options.mode);
    reviews = new ReviewStore(options.reviewDb);
    const { server, url } = await startManualServer({ store, reviews, port: options.port });
    const activeStore = store,
      activeReviews = reviews;
    store = undefined;
    reviews = undefined;
    const stop = () => server.close();
    process.once("SIGINT", stop);
    process.once("SIGTERM", stop);
    server.once("close", () => {
      process.removeListener("SIGINT", stop);
      process.removeListener("SIGTERM", stop);
      activeStore.close();
      activeReviews.close();
    });
    console.log(
      JSON.stringify(
        { mode: options.mode, url, manual_db: options.db, review_db: options.reviewDb },
        null,
        2,
      ),
    );
    return 0;
  } catch {
    console.error(
      "Manual import could not start. Check --help, separate private database paths and the available port.",
    );
    return 2;
  } finally {
    store?.close();
    reviews?.close();
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href)
  process.exitCode = await main();
