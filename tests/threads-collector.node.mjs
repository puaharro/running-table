import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { Store } from "../scripts/threads/store.mjs";
import { ThreadsClient, CollectorError, nextCursor } from "../scripts/threads/client.mjs";
import { collect } from "../scripts/threads/collector.mjs";
import { parseOptions } from "../scripts/collect-threads.mjs";

const post = (id, extra = {}) => ({
  id,
  username: "runner",
  text: "大阪マラソン跑完了",
  timestamp: "2026-02-22T08:00:00+0000",
  permalink: `https://www.threads.net/@runner/post/${id}`,
  ...extra,
});
const reply = (id, parent = "100", extra = {}) =>
  post(id, { root_post: { id: "100" }, replied_to: { id: parent }, ...extra });
const page = (data, endpoint = "keyword_search", after = null) => ({
  data,
  ...(after
    ? {
        paging: {
          next: `https://graph.threads.net/v1.0/${endpoint}?after=${after}&access_token=DO_NOT_PERSIST`,
          cursors: { after },
        },
      }
    : {}),
});
const response = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), { status, headers });
function fixture(t, keywords = ["大阪マラソン", "Osaka Marathon"]) {
  const store = new Store(":memory:");
  t.after(() => store.close());
  const runId = store.createRun({ race: "Osaka Marathon", year: 2027, keywords });
  return { store, runId };
}
function client(store, runId, fetchImpl, extra = {}) {
  return new ThreadsClient({
    token: "TEST_SECRET",
    intervalMs: 0,
    sleep: async () => {},
    fetchImpl,
    onError: (error) => store.error(runId, error),
    ...extra,
  });
}

test("multilingual paginated discovery, nested replies, provenance and unique counts", async (t) => {
  const { store, runId } = fixture(t);
  const requests = [];
  const api = client(store, runId, async (url, options) => {
    assert.equal(options.headers.Authorization, "Bearer TEST_SECRET");
    assert.equal(options.redirect, "error");
    assert.equal(url.searchParams.has("access_token"), false);
    requests.push(`${url.pathname}:${url.searchParams.get("q")}:${url.searchParams.get("after")}`);
    if (url.pathname.endsWith("keyword_search")) {
      if (url.searchParams.get("after") === "SEARCH2")
        return response(page([post("200", { username: "runner2" })]));
      return response(
        page(
          [post("100")],
          "keyword_search",
          url.searchParams.get("q") === "大阪マラソン" ? "SEARCH2" : null,
        ),
      );
    }
    if (url.pathname.includes("/200/")) return response(page([]));
    if (url.searchParams.get("after"))
      return response(page([reply("102", "101", { username: "nested" }), reply("101")]));
    return response(page([reply("101")], "100/conversation", "REPLY2"));
  });
  const result = await collect({ store, runId, client: api });
  assert.equal(result.status, "complete");
  assert.equal(result.posts_discovered, 2);
  assert.equal(result.conversations_fetched, 2);
  assert.equal(result.comments_collected, 2);
  assert.equal(result.unique_accounts, 3);
  assert.equal(requests.length, 6);
  assert.equal(store.db.prepare("SELECT COUNT(*) AS n FROM post_discoveries").get().n, 3);
  assert.equal(
    store.db.prepare("SELECT parent_comment_id FROM threads_comments WHERE id='102'").get()
      .parent_comment_id,
    "101",
  );
  assert.equal(
    store.db.prepare("SELECT text FROM threads_posts WHERE id='100'").get().text,
    "大阪マラソン跑完了",
  );
  const pages = store.db.prepare("SELECT raw_data_json FROM collection_pages").all();
  assert.equal(pages.length, 6);
  assert.doesNotMatch(JSON.stringify(pages), /DO_NOT_PERSIST|TEST_SECRET/);
  await collect({
    store,
    runId,
    client: {
      getPage() {
        assert.fail("Completed run must make no requests");
      },
    },
  });
});

test("a failed conversation page resumes from the saved cursor after reopening SQLite", async (t) => {
  const directory = mkdtempSync(join(tmpdir(), "nxtgo-threads-"));
  const dbPath = join(directory, "collector.sqlite");
  let store = new Store(dbPath);
  t.after(() => {
    store.close();
    rmSync(directory, { recursive: true, force: true });
  });
  const runId = store.createRun({ race: "Osaka", year: 2027, keywords: ["Osaka"] });
  const api = client(store, runId, async (url) => {
    if (url.pathname.endsWith("keyword_search")) return response(page([post("100")]));
    if (url.searchParams.get("after"))
      return response({ error: { code: 100, message: "TEST_SECRET" } }, 400);
    return response(page([reply("101")], "100/conversation", "SAVED"));
  });
  assert.equal((await collect({ store, runId, client: api })).status, "partial");
  assert.equal(store.summary(runId).comments_collected, 1);
  store.close();
  store = new Store(dbPath);
  const resumed = client(store, runId, async (url) => {
    assert.match(url.pathname, /100\/conversation$/);
    assert.equal(url.searchParams.get("after"), "SAVED");
    return response(page([reply("102", "101")]));
  });
  const result = await collect({ store, runId, client: resumed });
  assert.equal(result.status, "complete");
  assert.equal(result.comments_collected, 2);
  assert.equal(result.failed_requests, 1);
  assert.doesNotMatch(
    JSON.stringify(store.db.prepare("SELECT * FROM api_errors").all()),
    /TEST_SECRET/,
  );
});

test("search interruption resumes without losing discoveries or keyword attribution", async (t) => {
  const { store, runId } = fixture(t, ["大阪"]);
  const abort = new AbortController();
  const api = client(store, runId, async () =>
    response(page([post("100")], "keyword_search", "CONTINUE")),
  );
  await assert.rejects(
    collect({ store, runId, client: api, signal: abort.signal, onProgress: () => abort.abort() }),
  );
  assert.equal(store.summary(runId).status, "interrupted");
  const requested = [];
  const resumed = client(store, runId, async (url) => {
    requested.push(url.pathname);
    if (url.pathname.endsWith("keyword_search")) {
      assert.equal(url.searchParams.get("after"), "CONTINUE");
      return response(page([post("100"), post("200")]));
    }
    return response(page([]));
  });
  const result = await collect({ store, runId, client: resumed });
  assert.equal(result.posts_discovered, 2);
  assert.equal(result.status, "complete");
  assert.equal(requested.length, 3);
});

test("failed storage rolls back the complete page and does not advance its cursor", (t) => {
  const { store, runId } = fixture(t, ["Osaka"]);
  const query = store.pendingQueries(runId)[0];
  assert.throws(() =>
    store.savePage(
      runId,
      query,
      { data: [post("100"), post("200", { text: {} })], next: "NEXT" },
      true,
    ),
  );
  assert.equal(store.summary(runId).posts_discovered, 0);
  assert.equal(store.pendingQueries(runId)[0].cursor, null);
  assert.equal(store.db.prepare("SELECT COUNT(*) AS n FROM collection_pages").get().n, 0);
});

test("pagination cursor without a next URL is terminal; invalid hosts and missing cursors fail", () => {
  assert.equal(
    nextCursor({ data: [], paging: { cursors: { after: "LAST" } } }, "keyword_search"),
    null,
  );
  for (const next of [
    "https://evil.example/steal?after=X",
    "https://graph.threads.net/v1.0/100/conversation?after=X",
    "not a url",
  ]) {
    assert.throws(() => nextCursor({ paging: { next } }, "keyword_search"), CollectorError);
  }
  assert.throws(
    () =>
      nextCursor(
        { paging: { next: "https://graph.threads.net/v1.0/keyword_search" } },
        "keyword_search",
      ),
    /missing_cursor/,
  );
});

test("repeated pagination cursors stop with an incomplete run instead of looping", async (t) => {
  const { store, runId } = fixture(t, ["Osaka"]);
  let calls = 0;
  const api = client(store, runId, async (url) => {
    calls++;
    return response(
      url.pathname.endsWith("keyword_search")
        ? page([post("100")], "keyword_search", "SAME")
        : page([]),
    );
  });
  const result = await collect({ store, runId, client: api });
  assert.equal(result.status, "partial");
  assert.equal(result.posts_discovered, 1);
  assert.equal(calls, 3);
  assert.equal(store.pendingQueries(runId)[0].cursor, "SAME");
  assert.equal(
    store.db.prepare("SELECT COUNT(*) AS n FROM api_errors WHERE kind='pagination_cycle'").get().n,
    1,
  );
});

test("429, transient API errors, network and 5xx retry, honor Retry-After and log safely", async (t) => {
  const { store, runId } = fixture(t);
  const sleeps = [];
  let calls = 0;
  const api = client(
    store,
    runId,
    async () => {
      calls++;
      if (calls === 1)
        return response({ error: { code: 4, message: "TEST_SECRET" } }, 429, {
          "retry-after": "3",
        });
      if (calls === 2) throw new Error("https://TEST_SECRET");
      if (calls === 3) return response({ error: { is_transient: true } }, 500);
      return response(page([]));
    },
    { sleep: async (ms) => sleeps.push(ms) },
  );
  assert.deepEqual(await api.getPage("keyword_search", {}), { data: [], next: null });
  assert.equal(calls, 4);
  assert.ok(sleeps.includes(3000));
  assert.equal(store.summary(runId).failed_requests, 3);
  assert.doesNotMatch(
    JSON.stringify(store.db.prepare("SELECT * FROM api_errors").all()),
    /TEST_SECRET/,
  );
});

test("bounded retries and long Retry-After preserve a resumable task", async (t) => {
  const { store, runId } = fixture(t);
  let calls = 0;
  const api = client(
    store,
    runId,
    async () => {
      calls++;
      return response({ error: { code: 4 } }, 429);
    },
    { retries: 2 },
  );
  await assert.rejects(collect({ store, runId, client: api }), /api_error/);
  assert.equal(calls, 3);
  assert.equal(store.summary(runId).status, "partial");
  const slow = client(store, runId, async () =>
    response({ error: { code: 4 } }, 429, { "retry-after": "3600" }),
  );
  await assert.rejects(slow.getPage("keyword_search", {}), /rate_limit_wait_required/);
});

test("invalid token stops immediately and leaves remaining work pending", async (t) => {
  const { store, runId } = fixture(t);
  let calls = 0;
  const api = client(store, runId, async () => {
    calls++;
    return response({ error: { code: 190, message: "TEST_SECRET" } }, 400);
  });
  await assert.rejects(collect({ store, runId, client: api }), /API 190/);
  assert.equal(calls, 1);
  assert.equal(store.summary(runId).pending_queries, 2);
  assert.equal(store.summary(runId).status, "partial");
});

test("unavailable conversations are recorded while other conversations continue", async (t) => {
  const { store, runId } = fixture(t, ["Osaka"]);
  const api = client(store, runId, async (url) => {
    if (url.pathname.endsWith("keyword_search")) return response(page([post("100"), post("200")]));
    if (url.pathname.includes("/100/")) return response({ error: { code: 100 } }, 400);
    return response(page([]));
  });
  const result = await collect({ store, runId, client: api });
  assert.equal(result.status, "partial");
  assert.equal(result.conversations_fetched, 1);
  assert.equal(result.pending_conversations, 1);
});

test("malformed successful responses never silently complete a query", async (t) => {
  const { store, runId } = fixture(t, ["Osaka"]);
  const api = client(store, runId, async () => response({ unexpected: [] }));
  const result = await collect({ store, runId, client: api });
  assert.equal(result.status, "partial");
  assert.equal(result.pending_queries, 1);
  assert.equal(result.failed_requests, 1);
});

test("missing parent is unknown; a nested search hit fetches its root conversation", async (t) => {
  const { store, runId } = fixture(t, ["Osaka"]);
  const api = client(store, runId, async (url) => {
    if (url.pathname.endsWith("keyword_search"))
      return response(
        page([
          post("999", { is_reply: true, root_post: { id: "100" }, replied_to: { id: "888" } }),
        ]),
      );
    assert.match(url.pathname, /100\/conversation$/);
    return response(page([reply("101", "999"), post("102", { root_post: { id: "100" } })]));
  });
  assert.equal((await collect({ store, runId, client: api })).status, "complete");
  assert.equal(
    store.db.prepare("SELECT parent_comment_id FROM threads_comments WHERE id='102'").get()
      .parent_comment_id,
    null,
  );
});

test("new runs refresh conversations, deduplicate globally and retain original page snapshots", async (t) => {
  const { store, runId } = fixture(t, ["Osaka"]);
  const api = client(store, runId, async (url) =>
    response(url.pathname.endsWith("keyword_search") ? page([post("100")]) : page([reply("101")])),
  );
  await collect({ store, runId, client: api });
  const second = store.createRun({ race: "Osaka Marathon", year: 2027, keywords: ["Osaka"] });
  const updated = client(store, second, async (url) =>
    response(
      url.pathname.endsWith("keyword_search")
        ? page([post("100")])
        : page([reply("101", "100", { text: "edited" }), reply("102")]),
    ),
  );
  const result = await collect({ store, runId: second, client: updated });
  assert.equal(result.comments_collected, 2);
  assert.equal(store.db.prepare("SELECT COUNT(*) AS n FROM threads_comments").get().n, 2);
  assert.match(
    store.db
      .prepare("SELECT raw_data_json FROM collection_pages WHERE run_id=? AND task_key='post:100'")
      .get(runId).raw_data_json,
    /大阪/,
  );
  assert.equal(
    store.db.prepare("SELECT text FROM threads_comments WHERE id='101'").get().text,
    "edited",
  );
});

test("CLI validates input and keeps database paths in the private directory", () => {
  const options = parseOptions([
    "--race",
    "Osaka",
    "--year",
    "2027",
    "--keyword",
    "大阪",
    "--keyword",
    "大阪",
  ]);
  assert.deepEqual(options.keywords, ["大阪"]);
  assert.match(options.db, /\.editorial-private/);
  for (const args of [
    [],
    ["--race", "Osaka", "--year", "oops"],
    ["--resume", "id", "--year", "2027"],
    ["--resume", "id", "--db", "public/leak.sqlite"],
    ["--resume", "id", "--status", "id"],
    ["--race", "Osaka", "--year", "2027", "--page-size", "0"],
  ]) {
    assert.throws(() => parseOptions(args));
  }
});

test("CLI help works offline and private directories are ignored by Git", () => {
  const output = execFileSync(process.execPath, ["scripts/collect-threads.mjs", "--help"], {
    encoding: "utf8",
  });
  assert.match(output, /No classification, scoring/);
  assert.match(
    execFileSync(
      "git",
      ["check-ignore", ".editorial-private/threads/collector.sqlite", ".env.local"],
      { encoding: "utf8" },
    ),
    /collector.sqlite/,
  );
  const result = spawnSync(
    process.execPath,
    ["scripts/collect-threads.mjs", "--race", "Osaka", "--year", "2027"],
    {
      encoding: "utf8",
      env: { ...process.env, THREADS_ACCESS_TOKEN: "" },
    },
  );
  assert.equal(result.status, 2);
  assert.match(result.stderr, /missing_access_token/);
});
