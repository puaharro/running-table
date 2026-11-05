import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { randomUUID } from "node:crypto";
import { CollectorError } from "./client.mjs";

const now = () => new Date().toISOString();
export class Store {
  constructor(path) {
    if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
    this.db = new DatabaseSync(path);
    this.db.exec(`PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS races (id INTEGER PRIMARY KEY, name TEXT NOT NULL, target_year INTEGER NOT NULL, UNIQUE(name,target_year));
      CREATE TABLE IF NOT EXISTS collection_runs (id TEXT PRIMARY KEY, race_id INTEGER NOT NULL REFERENCES races(id),
        search_type TEXT NOT NULL, page_size INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'pending', started_at TEXT NOT NULL,
        updated_at TEXT NOT NULL, finished_at TEXT);
      CREATE TABLE IF NOT EXISTS search_queries (id INTEGER PRIMARY KEY, run_id TEXT NOT NULL REFERENCES collection_runs(id),
        keyword TEXT NOT NULL, cursor TEXT, status TEXT NOT NULL DEFAULT 'pending', UNIQUE(run_id,keyword));
      CREATE TABLE IF NOT EXISTS threads_posts (id TEXT PRIMARY KEY, username TEXT, text TEXT, timestamp TEXT, permalink TEXT,
        root_post_id TEXT, parent_id TEXT, first_collected_at TEXT NOT NULL, last_collected_at TEXT NOT NULL, raw_json TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS threads_comments (id TEXT PRIMARY KEY, root_post_id TEXT NOT NULL, parent_comment_id TEXT,
        username TEXT, text TEXT, timestamp TEXT, permalink TEXT, first_collected_at TEXT NOT NULL,
        last_collected_at TEXT NOT NULL, raw_json TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS post_discoveries (query_id INTEGER NOT NULL REFERENCES search_queries(id),
        post_id TEXT NOT NULL REFERENCES threads_posts(id), discovered_at TEXT NOT NULL, PRIMARY KEY(query_id,post_id));
      CREATE TABLE IF NOT EXISTS run_posts (run_id TEXT NOT NULL REFERENCES collection_runs(id), post_id TEXT NOT NULL,
        cursor TEXT, status TEXT NOT NULL DEFAULT 'pending', PRIMARY KEY(run_id,post_id));
      CREATE TABLE IF NOT EXISTS run_comments (run_id TEXT NOT NULL REFERENCES collection_runs(id),
        comment_id TEXT NOT NULL REFERENCES threads_comments(id), PRIMARY KEY(run_id,comment_id));
      CREATE TABLE IF NOT EXISTS collection_pages (id INTEGER PRIMARY KEY, run_id TEXT NOT NULL REFERENCES collection_runs(id),
        task_key TEXT NOT NULL, cursor TEXT NOT NULL, collected_at TEXT NOT NULL, raw_data_json TEXT NOT NULL,
        UNIQUE(run_id,task_key,cursor));
      CREATE TABLE IF NOT EXISTS api_errors (id INTEGER PRIMARY KEY, run_id TEXT NOT NULL REFERENCES collection_runs(id),
        endpoint TEXT NOT NULL, attempt INTEGER NOT NULL, kind TEXT NOT NULL, http_status INTEGER, api_code INTEGER, occurred_at TEXT NOT NULL);
      CREATE INDEX IF NOT EXISTS comments_root ON threads_comments(root_post_id);
      CREATE INDEX IF NOT EXISTS queries_run ON search_queries(run_id);`);
  }
  close() {
    this.db.close();
  }
  transaction(fn) {
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const result = fn();
      this.db.exec("COMMIT");
      return result;
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }
  createRun({ race, year, keywords, searchType = "RECENT", pageSize = 100 }) {
    return this.transaction(() => {
      this.db.prepare("INSERT OR IGNORE INTO races(name,target_year) VALUES (?,?)").run(race, year);
      const raceId = this.db
        .prepare("SELECT id FROM races WHERE name=? AND target_year=?")
        .get(race, year).id;
      const id = randomUUID(),
        at = now();
      this.db
        .prepare(
          "INSERT INTO collection_runs(id,race_id,search_type,page_size,started_at,updated_at) VALUES (?,?,?,?,?,?)",
        )
        .run(id, raceId, searchType, pageSize, at, at);
      for (const keyword of new Set(keywords))
        this.db.prepare("INSERT INTO search_queries(run_id,keyword) VALUES (?,?)").run(id, keyword);
      return id;
    });
  }
  run(id) {
    const result = this.db
      .prepare(
        "SELECT c.*, r.name AS race, r.target_year FROM collection_runs c JOIN races r ON r.id=c.race_id WHERE c.id=?",
      )
      .get(id);
    if (!result) throw new CollectorError("unknown_run");
    return result;
  }
  setStatus(id, status) {
    this.db
      .prepare("UPDATE collection_runs SET status=?,updated_at=?,finished_at=? WHERE id=?")
      .run(status, now(), status === "complete" ? now() : null, id);
  }
  pendingQueries(id) {
    return this.db
      .prepare("SELECT * FROM search_queries WHERE run_id=? AND status!='complete' ORDER BY id")
      .all(id);
  }
  pendingPosts(id) {
    return this.db
      .prepare("SELECT * FROM run_posts WHERE run_id=? AND status!='complete' ORDER BY post_id")
      .all(id);
  }
  error(id, error) {
    this.db
      .prepare(
        "INSERT INTO api_errors(run_id,endpoint,attempt,kind,http_status,api_code,occurred_at) VALUES (?,?,?,?,?,?,?)",
      )
      .run(
        id,
        error.endpoint,
        error.attempt ?? 0,
        error.kind,
        error.status ?? null,
        error.code ?? null,
        now(),
      );
  }
  failTask(table, runId, taskId, error) {
    const column = table === "search_queries" ? "id" : "post_id";
    if (!["search_queries", "run_posts"].includes(table)) throw new Error("Invalid task");
    this.db
      .prepare(`UPDATE ${table} SET status='failed' WHERE run_id=? AND ${column}=?`)
      .run(runId, taskId);
    this.error(runId, {
      endpoint: table === "search_queries" ? "keyword_search" : `${taskId}/conversation`,
      kind: error.kind ?? "storage_or_protocol_error",
      status: error.status,
      code: error.code,
    });
  }
  savePage(runId, task, page, isSearch) {
    this.transaction(() => {
      const key = isSearch ? `query:${task.id}` : `post:${task.post_id}`;
      if (
        page.next !== null &&
        (page.next === task.cursor ||
          this.db
            .prepare("SELECT 1 FROM collection_pages WHERE run_id=? AND task_key=? AND cursor=?")
            .get(runId, key, page.next))
      ) {
        throw new CollectorError("pagination_cycle");
      }
      const at = now();
      for (const item of page.data) {
        if (isSearch) {
          this.db
            .prepare(
              `INSERT INTO threads_posts VALUES (?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET
            username=excluded.username,text=excluded.text,timestamp=excluded.timestamp,permalink=excluded.permalink,
            root_post_id=excluded.root_post_id,parent_id=excluded.parent_id,last_collected_at=excluded.last_collected_at,raw_json=excluded.raw_json`,
            )
            .run(
              item.id,
              item.username ?? null,
              item.text ?? null,
              item.timestamp ?? null,
              item.permalink ?? null,
              item.root_post?.id ?? null,
              item.replied_to?.id ?? null,
              at,
              at,
              JSON.stringify(item),
            );
          this.db
            .prepare("INSERT OR IGNORE INTO post_discoveries VALUES (?,?,?)")
            .run(task.id, item.id, at);
          const rootId = item.root_post?.id ?? item.id;
          if (!/^\d+$/.test(rootId)) throw new CollectorError("invalid_root_id");
          this.db
            .prepare("INSERT OR IGNORE INTO run_posts(run_id,post_id) VALUES (?,?)")
            .run(runId, rootId);
        } else {
          if (item.root_post?.id && item.root_post.id !== task.post_id)
            throw new CollectorError("unexpected_reply_root");
          this.db
            .prepare(
              `INSERT INTO threads_comments VALUES (?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET
            root_post_id=excluded.root_post_id,parent_comment_id=excluded.parent_comment_id,username=excluded.username,
            text=excluded.text,timestamp=excluded.timestamp,permalink=excluded.permalink,last_collected_at=excluded.last_collected_at,raw_json=excluded.raw_json`,
            )
            .run(
              item.id,
              task.post_id,
              item.replied_to?.id ?? null,
              item.username ?? null,
              item.text ?? null,
              item.timestamp ?? null,
              item.permalink ?? null,
              at,
              at,
              JSON.stringify(item),
            );
          this.db.prepare("INSERT OR IGNORE INTO run_comments VALUES (?,?)").run(runId, item.id);
        }
      }
      this.db
        .prepare(
          "INSERT INTO collection_pages(run_id,task_key,cursor,collected_at,raw_data_json) VALUES (?,?,?,?,?)",
        )
        .run(runId, key, task.cursor ?? "", at, JSON.stringify(page.data));
      const table = isSearch ? "search_queries" : "run_posts",
        column = isSearch ? "id" : "post_id";
      this.db
        .prepare(`UPDATE ${table} SET cursor=?,status=? WHERE run_id=? AND ${column}=?`)
        .run(
          page.next,
          page.next === null ? "complete" : "pending",
          runId,
          isSearch ? task.id : task.post_id,
        );
      this.db.prepare("UPDATE collection_runs SET updated_at=? WHERE id=?").run(at, runId);
    });
  }
  summary(id) {
    const run = this.run(id);
    const count = (sql) => this.db.prepare(sql).get(id).n;
    return {
      run_id: id,
      race: run.race,
      target_year: run.target_year,
      status: run.status,
      posts_discovered: count(
        "SELECT COUNT(DISTINCT d.post_id) AS n FROM post_discoveries d JOIN search_queries q ON q.id=d.query_id WHERE q.run_id=?",
      ),
      conversations_fetched: count(
        "SELECT COUNT(*) AS n FROM run_posts WHERE run_id=? AND status='complete'",
      ),
      comments_collected: count("SELECT COUNT(*) AS n FROM run_comments WHERE run_id=?"),
      unique_accounts:
        count(`WITH target AS (SELECT ? AS run_id) SELECT COUNT(DISTINCT username) AS n FROM (
        SELECT p.username FROM threads_posts p JOIN post_discoveries d ON d.post_id=p.id JOIN search_queries q ON q.id=d.query_id WHERE q.run_id=(SELECT run_id FROM target)
        UNION ALL SELECT c.username FROM threads_comments c JOIN run_comments r ON r.comment_id=c.id WHERE r.run_id=(SELECT run_id FROM target)) WHERE username IS NOT NULL AND username!=''`),
      failed_requests: count("SELECT COUNT(*) AS n FROM api_errors WHERE run_id=? AND attempt>0"),
      pending_queries: this.pendingQueries(id).length,
      pending_conversations: this.pendingPosts(id).length,
    };
  }
}
