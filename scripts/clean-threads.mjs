import { DatabaseSync } from "node:sqlite";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { randomUUID } from "node:crypto";
import { parseArgs } from "node:util";
import { parseInspectOptions, preview } from "./inspect-threads.mjs";
import { readReport } from "./threads/report.mjs";
import { cleanReport, cleaningDemo, PRESETS } from "./threads/clean.mjs";
import { renderCleanReport } from "./threads/clean-view.mjs";

const HELP = `Hong Kong Threads cleaning (no scoring, no token required)
  npm run clean:threads -- --demo --preset hk-marathon --serve
  npm run clean:threads -- --run RUN_ID --preset hk-marathon --format json

Required --preset: ${Object.keys(PRESETS).join(", ")}
Use --demo OR --run ID. --db, --output, --format html|json, --serve, --port
work like inspect:threads. Exports stay in .editorial-private/ and never overwrite.
Raw data is never deleted. Decisions: keep, review, exclude.\n`;

export function parseCleanOptions(args) {
  const { values } = parseArgs({
    args,
    options: {
      preset: { type: "string" },
      demo: { type: "boolean" },
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
  if (!PRESETS[values.preset]) throw new Error("Select a supported --preset.");
  const shared = Object.entries(values)
    .filter(([key]) => key !== "preset")
    .flatMap(([key, value]) =>
      typeof value === "boolean" ? (value ? [`--${key}`] : []) : [`--${key}`, value],
    );
  const options = parseInspectOptions(shared);
  if (options.demo && values.preset !== "hk-marathon")
    throw new Error("The fictional demo uses hk-marathon; use --run for other presets.");
  return { ...options, preset: values.preset };
}
export async function main(args = process.argv.slice(2)) {
  let db;
  try {
    const options = parseCleanOptions(args);
    if (options.help) {
      console.log(HELP);
      return 0;
    }
    let source;
    if (options.demo) source = await cleaningDemo();
    else {
      if (!existsSync(options.db)) throw new Error("No database.");
      db = new DatabaseSync(options.db, { readOnly: true });
      db.exec("PRAGMA busy_timeout=5000");
      source = readReport(db, options.run);
      db.close();
      db = undefined;
    }
    const result = cleanReport(source, options.preset);
    const content =
      options.format === "json" ? JSON.stringify(result, null, 2) : renderCleanReport(result);
    const output =
      options.output ??
      fileURLToPath(
        new URL(
          `../.editorial-private/threads/cleaned/${options.demo ? "fictional-demo" : result.run.id}-${randomUUID().slice(0, 8)}.${options.format}`,
          import.meta.url,
        ),
      );
    mkdirSync(dirname(output), { recursive: true });
    writeFileSync(output, content, { encoding: "utf8", flag: "wx" });
    console.log(
      JSON.stringify(
        {
          mode: result.mode,
          rule_version: result.rule_version,
          target: result.target.name,
          summary: result.summary,
          output,
        },
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
    console.error(
      error.code === "EEXIST"
        ? "Output already exists; choose another file."
        : "Cleaning failed. Check --help, the race preset, private database and run ID.",
    );
    return 2;
  } finally {
    db?.close();
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href)
  process.exitCode = await main();
