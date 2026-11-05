import { DatabaseSync } from "node:sqlite";
import { createServer } from "node:http";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve, dirname, relative, isAbsolute, extname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import { randomUUID } from "node:crypto";
import { demoReport, listRuns, readReport, renderReport } from "./threads/report.mjs";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const PRIVATE = resolve(ROOT, ".editorial-private");
export const HELP = `Threads private evidence viewer (Node.js 24+; no token required)
  npm run inspect:threads -- --demo --serve
  npm run inspect:threads -- --list
  npm run inspect:threads -- --run RUN_ID --serve
  npm run inspect:threads -- --run RUN_ID --format json

Options:
  --demo          Fictional in-memory dataset; no API calls or real database writes
  --list          List stored collection runs as JSON
  --run ID        Inspect one stored run's committed page snapshots
  --db FILE       Existing SQLite DB inside this repo's .editorial-private/
  --format TYPE   html (default) or json
  --output FILE   New file inside .editorial-private/; never overwrite an existing file
  --serve         Preview HTML on 127.0.0.1; Ctrl+C to stop
  --port N        Preview port (default 0: choose a free port)
  --help          Show usage
`;

export function privatePath(path) {
  const target = resolve(path),
    within = relative(PRIVATE, target);
  if (!within || within.startsWith("..") || isAbsolute(within)) {
    throw new Error("Files must stay inside this repo's .editorial-private/ directory.");
  }
  return target;
}

export function parseInspectOptions(args) {
  const { values } = parseArgs({
    args,
    options: {
      demo: { type: "boolean" },
      list: { type: "boolean" },
      run: { type: "string" },
      db: { type: "string" },
      format: { type: "string" },
      output: { type: "string" },
      serve: { type: "boolean" },
      port: { type: "string" },
      help: { type: "boolean" },
    },
  });
  if (values.help) return { help: true };
  if ([values.demo, values.list, Boolean(values.run)].filter(Boolean).length !== 1) {
    throw new Error("Choose exactly one of --demo, --list or --run RUN_ID.");
  }
  if (values.demo && values.db) throw new Error("Demo does not read a database; omit --db.");
  if (
    values.list &&
    ["format", "output", "serve", "port"].some((key) => values[key] !== undefined)
  ) {
    throw new Error("--list only prints JSON; omit export/preview options.");
  }
  const format = values.format ?? "html";
  if (!["html", "json"].includes(format)) throw new Error("Format must be html or json.");
  if (values.serve && format !== "html") throw new Error("Preview requires HTML format.");
  const port = Number(values.port ?? 0);
  if (
    !Number.isInteger(port) ||
    port < 0 ||
    port > 65535 ||
    (values.port !== undefined && !values.serve)
  ) {
    throw new Error("--port requires --serve and a port from 0 to 65535.");
  }
  const db = privatePath(values.db ?? resolve(PRIVATE, "threads/collector.sqlite"));
  const output = values.output ? privatePath(values.output) : null;
  if (output && extname(output).toLowerCase() !== `.${format}`)
    throw new Error("Output extension must match format.");
  return {
    demo: values.demo,
    list: values.list,
    run: values.run,
    db,
    format,
    output,
    serve: values.serve,
    port,
  };
}

// Serve only the generated HTML in memory, never an arbitrary path or the SQLite file.
export async function preview(html, port = 0) {
  const server = createServer((request, response) => {
    if (!["GET", "HEAD"].includes(request.method)) {
      response.writeHead(405, { Allow: "GET, HEAD" }).end();
      return;
    }
    if (request.url !== "/") {
      response.writeHead(404).end();
      return;
    }
    response.writeHead(200, {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
      "X-Frame-Options": "DENY",
    });
    response.end(request.method === "HEAD" ? undefined : html);
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", resolve);
  });
  return server;
}

export async function main(args = process.argv.slice(2)) {
  let db;
  try {
    const options = parseInspectOptions(args);
    if (options.help) {
      console.log(HELP);
      return 0;
    }
    let report;
    if (options.demo) report = await demoReport();
    else {
      if (!existsSync(options.db))
        throw new Error("Database not found. Use --demo while no collection exists.");
      db = new DatabaseSync(options.db, { readOnly: true });
      db.exec("PRAGMA busy_timeout=5000");
      if (options.list) {
        console.log(JSON.stringify(listRuns(db), null, 2));
        return 0;
      }
      report = readReport(db, options.run);
    }
    db?.close();
    db = undefined;
    const content =
      options.format === "html" ? renderReport(report) : JSON.stringify(report, null, 2);
    const output =
      options.output ??
      resolve(
        PRIVATE,
        "threads/reports",
        `${options.demo ? "fictional-demo" : report.run.id}-${randomUUID().slice(0, 8)}.${options.format}`,
      );
    mkdirSync(dirname(output), { recursive: true });
    writeFileSync(output, content, { encoding: "utf8", flag: "wx" });
    console.log(
      JSON.stringify(
        { mode: report.mode, output, run_id: report.run.id, summary: report.summary },
        null,
        2,
      ),
    );
    if (options.serve) {
      const server = await preview(content, options.port);
      console.log(`Private preview: http://127.0.0.1:${server.address().port}/`);
      const stop = () => server.close();
      process.once("SIGINT", stop);
      process.once("SIGTERM", stop);
      server.once("close", () => {
        process.removeListener("SIGINT", stop);
        process.removeListener("SIGTERM", stop);
      });
    }
    return 0;
  } catch (error) {
    // Do not echo arbitrary stored data or paths from database/parser errors.
    console.error(
      error.code === "EEXIST"
        ? "Output already exists; choose another --output file."
        : error.message?.startsWith("Choose ") || error.message?.startsWith("Database not found")
          ? error.message
          : "Inspection failed. Check --help, private paths and the stored run ID.",
    );
    return 2;
  } finally {
    db?.close();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href)
  process.exitCode = await main();
