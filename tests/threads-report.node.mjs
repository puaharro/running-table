import { test } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { createHash } from "node:crypto";
import { mkdtempSync, rmSync, realpathSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve, relative, isAbsolute, join } from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { Store } from "../scripts/threads/store.mjs";
import {
  readReport,
  demoReport,
  renderReport,
  listRuns,
  replyDepth,
  sourceLink,
} from "../scripts/threads/report.mjs";
import { parseInspectOptions, privatePath } from "../scripts/inspect-threads.mjs";

test("offline demo labels all evidence fictional and exercises partial progress/nesting", async () => {
  const report = await demoReport();
  assert.equal(report.mode, "demo");
  assert.match(report.run.race, /虛構/);
  assert.equal(report.run.status, "partial");
  assert.equal(report.summary.posts, 2);
  assert.equal(report.summary.comments, 4);
  assert.equal(report.summary.accounts, 6);
  assert.equal(report.summary.conversations_complete, 1);
  assert.equal(report.summary.conversations_total, 2);
  assert.equal(report.posts[0].keywords.length, 2);
  assert.equal(report.errors[0].kind, "demo_unavailable");
  assert.ok(report.comments.every((item) => item.raw.text.includes("虛構示範")));
  const html = renderReport(report);
  assert.match(html, /沒有連接 Threads/);
  assert.match(html, /層級未知／父節點缺漏/);
  assert.match(html, /第 3 層/);
  assert.match(html, /data-status="failed"/);
  assert.match(html, /<input id="search"/);
});

test("reports reconstruct an earlier run from snapshots even after a later upsert", (t) => {
  const store = new Store(":memory:");
  t.after(() => store.close());
  const first = store.createRun({ race: "Fictional race", year: 2027, keywords: ["A", "B"] });
  for (const query of store.pendingQueries(first))
    store.savePage(
      first,
      query,
      {
        data: [{ id: "100", text: "original evidence", username: "original_author" }],
        next: null,
      },
      true,
    );
  store.savePage(
    first,
    store.pendingPosts(first)[0],
    { data: [{ id: "101", text: "first reply", replied_to: { id: "100" } }], next: null },
    false,
  );
  store.setStatus(first, "complete");
  const second = store.createRun({ race: "Fictional race", year: 2027, keywords: ["A"] });
  store.savePage(
    second,
    store.pendingQueries(second)[0],
    {
      data: [{ id: "100", text: "edited later", username: "changed_author" }],
      next: null,
    },
    true,
  );
  store.savePage(
    second,
    store.pendingPosts(second)[0],
    { data: [{ id: "101", text: "edited reply" }], next: null },
    false,
  );
  const report = readReport(store.db, first);
  assert.equal(report.posts[0].raw.text, "original evidence");
  assert.equal(report.posts[0].raw.username, "original_author");
  assert.equal(report.comments[0].raw.text, "first reply");
  assert.deepEqual(report.posts[0].keywords, ["A", "B"]);
  assert.equal(report.comments[0].parent_id, "100");
  assert.equal(listRuns(store.db).length, 2);
  assert.throws(() => readReport(store.db, "missing"), /unknown_run/);
  assert.equal(listRuns(store.db).length, 2); // failed reads release their transaction
});

test("reading an actual file is read-only and does not change its bytes", () => {
  const directory = mkdtempSync(join(tmpdir(), "nxtgo-report-"));
  let reader, writer;
  try {
    const dbPath = join(directory, "evidence.sqlite");
    writer = new Store(dbPath);
    const id = writer.createRun({ race: "Fictional race", year: 2027, keywords: ["Demo"] });
    writer.close();
    writer = undefined;
    const before = createHash("sha256").update(readFileSync(dbPath)).digest("hex");
    reader = new DatabaseSync(dbPath, { readOnly: true });
    assert.equal(readReport(reader, id).summary.posts, 0);
    assert.equal(listRuns(reader).length, 1);
    reader.close();
    reader = undefined;
    assert.equal(createHash("sha256").update(readFileSync(dbPath)).digest("hex"), before);
  } finally {
    reader?.close();
    writer?.close();
    const tempRoot = realpathSync(tmpdir()),
      target = realpathSync(directory);
    const within = relative(tempRoot, target);
    assert.ok(within && !within.startsWith("..") && !isAbsolute(within));
    rmSync(target, { recursive: true, force: true });
  }
});

test("HTML escapes untrusted post fields and allows only HTTPS Threads source links", async () => {
  const report = await demoReport();
  const payload = "</script><script>alert(1)</script><img src=x onerror=alert(2)>";
  report.run.race = payload;
  report.posts[0].raw.text = payload;
  report.posts[0].raw.username = '\"><svg onload=alert(3)>';
  report.posts[0].raw.permalink = "javascript:alert(4)";
  report.posts[0].keywords = [payload];
  report.errors[0].kind = payload;
  const html = renderReport(report);
  assert.doesNotMatch(html, /<img|<svg|<script>alert|href="javascript:/);
  assert.match(html, /&lt;script&gt;alert/);
  assert.equal((html.match(/<script>/g) ?? []).length, 1);
  const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
  const hash = createHash("sha256").update(script).digest("base64");
  assert.ok(html.includes(`script-src 'sha256-${hash}'`));
  assert.match(html, /default-src 'none'/);
  assert.equal(
    sourceLink("https://www.threads.com/@demo/post/abc"),
    "https://www.threads.com/@demo/post/abc",
  );
  for (const value of [
    "javascript:alert(1)",
    "http://www.threads.net/test",
    "https://threads.net.evil.example/",
    "https://user:pass@threads.net/",
    "https://example.com/",
    "/local",
  ])
    assert.equal(sourceLink(value), null);
});

test("missing/cyclic/cross-root parents do not get fabricated depth", () => {
  const comments = [
    { id: "1", root_post_id: "100", parent_id: "100" },
    { id: "2", root_post_id: "100", parent_id: "1" },
    { id: "3", root_post_id: "100", parent_id: "4" },
    { id: "4", root_post_id: "100", parent_id: "3" },
    { id: "5", root_post_id: "100", parent_id: "missing" },
    { id: "6", root_post_id: "200", parent_id: "1" },
  ];
  assert.deepEqual(
    comments.map((comment) => replyDepth(comment, comments)),
    [1, 2, null, null, null, null],
  );
});

test("CLI validates private exports, modes and preview options without a token", () => {
  assert.equal(parseInspectOptions(["--demo", "--serve"]).port, 0);
  assert.equal(parseInspectOptions(["--run", "id", "--format", "json"]).format, "json");
  for (const args of [
    [],
    ["--demo", "--run", "id"],
    ["--demo", "--db", "anything"],
    ["--list", "--serve"],
    ["--demo", "--format", "csv"],
    ["--demo", "--format", "json", "--serve"],
    ["--demo", "--port", "3000"],
    ["--demo", "--output", "public/leak.html"],
    ["--demo", "--output", ".editorial-private/report.json"],
    ["--demo", "--serve", "--port", "70000"],
  ])
    assert.throws(() => parseInspectOptions(args));
  assert.throws(() => privatePath(resolve("out/leak.html")));
  const help = execFileSync(process.execPath, ["scripts/inspect-threads.mjs", "--help"], {
    encoding: "utf8",
    env: { ...process.env, THREADS_ACCESS_TOKEN: "" },
  });
  assert.match(help, /no token required/);
});

test("CLI exports a fictional JSON report without a token and refuses to overwrite it", () => {
  const output = resolve(
    ".editorial-private/threads/reports",
    `cli-test-${process.pid}-${Date.now()}.json`,
  );
  try {
    const args = ["scripts/inspect-threads.mjs", "--demo", "--format", "json", "--output", output];
    const result = JSON.parse(
      execFileSync(process.execPath, args, {
        encoding: "utf8",
        env: { ...process.env, THREADS_ACCESS_TOKEN: "" },
      }),
    );
    assert.equal(result.output, output);
    const original = readFileSync(output, "utf8");
    assert.equal(JSON.parse(original).mode, "demo");
    const duplicate = spawnSync(process.execPath, args, { encoding: "utf8" });
    assert.equal(duplicate.status, 2);
    assert.match(duplicate.stderr, /Output already exists/);
    assert.equal(readFileSync(output, "utf8"), original);
  } finally {
    rmSync(output, { force: true });
  }
});
