import { test } from "node:test";
import assert from "node:assert/strict";
import { Script } from "node:vm";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { publicReference, evidenceLink } from "../scripts/research/sources.mjs";
import {
  ManualStore,
  threadsReference,
  validateManualInput,
} from "../scripts/threads/manual-store.mjs";
import { renderManualImport } from "../scripts/threads/manual-view.mjs";
import { parseImportOptions } from "../scripts/import-threads.mjs";

export const fixtures = {
  threads: "https://www.threads.com/@fictional/post/FIXTURE",
  marathonsworld: "https://www.marathonsworld.com/artapp/rating_detail.php?rid=123456",
  facebook: "https://www.facebook.com/groups/123/posts/456/?comment_id=789",
  instagram: "https://www.instagram.com/p/FIXTURE/",
  youtube: "https://www.youtube.com/watch?v=ABCDEFGHIJK&lc=fixture-comment",
  biji: "https://running.biji.co/index.php?q=review&act=detail&id=123",
  blog: "https://fictional.example/races/2025-half",
};
export const input = (platform = "marathonsworld", extra = {}) => ({
  preset: "hzmb-half",
  target_year: 2025,
  kind: "post",
  text: "【虛構測試】港珠澳大橋半馬補給正常，但想多一個水站。",
  source_url: fixtures[platform],
  username: "fictional",
  note: "只供測試，不是真實評論。",
  link_scope: "item",
  root_url: "",
  parent_relation: "unknown",
  parent_url: "",
  source_platform: platform,
  posted_date: "",
  race_group: "半馬",
  runner_segment: "unknown",
  experience: "unknown",
  event_page_year: 2025,
  ...extra,
});

test("all requested sources preserve usable public links without claiming verification", () => {
  for (const [platform, url] of Object.entries(fixtures)) {
    const ref = publicReference(platform, url);
    assert.match(ref.id, /^manual-[a-f0-9]{64}$/);
    assert.equal(new URL(ref.url).protocol, "https:");
    assert.equal(
      validateManualInput(input(platform), { multiSource: true }).source_platform,
      platform,
    );
  }
  assert.equal(
    publicReference("threads", fixtures.threads).id,
    threadsReference(fixtures.threads).id,
  );
  assert.equal(
    evidenceLink({
      raw: {
        source_platform: "facebook",
        ingestion_method: "manual_paste",
        source_post_url: fixtures.facebook,
      },
    }),
    publicReference("facebook", fixtures.facebook).url,
  );
  assert.equal(evidenceLink({ raw: { source_post_url: fixtures.facebook } }), null);
  assert.equal(
    evidenceLink({
      raw: {
        source_platform: "facebook",
        ingestion_method: "manual_paste",
        source_post_url: "javascript:alert(1)",
      },
    }),
    null,
  );
});

test("platform, transport and private-URL validation remains strict", () => {
  for (const url of [
    "http://fictional.example/post",
    "https://u:p@fictional.example/post",
    "https://localhost/post",
    "https://127.0.0.1/post",
    "https://[::1]/post",
    "https://fictional.local/post",
    "javascript:alert(1)",
  ])
    assert.throws(() => publicReference("blog", url));
  assert.throws(() => publicReference("threads", "https://threads.com.evil.example/@x/post/X"));
  assert.throws(() => publicReference("blog", fixtures.threads));
  assert.throws(() => publicReference("instagram", "https://instagram.com/accounts/login/"));
  assert.throws(() =>
    publicReference("marathonsworld", "https://marathonsworld.com/artapp/racedetail.php?rid=x"),
  );
  assert.throws(() => publicReference("youtube", "https://youtube.com/results?search_query=run"));
  assert.throws(() => validateManualInput(input())); // old Threads workflow is not silently widened
});

test("comment identity survives tracking while separate comments never merge", () => {
  assert.equal(
    publicReference("youtube", "https://youtu.be/ABCDEFGHIJK?si=tracking").id,
    publicReference("youtube", "https://www.youtube.com/watch?v=ABCDEFGHIJK&t=40").id,
  );
  assert.notEqual(
    publicReference("youtube", fixtures.youtube).id,
    publicReference("youtube", fixtures.youtube.replace("fixture-comment", "other-comment")).id,
  );
  assert.equal(
    publicReference("facebook", fixtures.facebook + "&fbclid=tracking").id,
    publicReference("facebook", fixtures.facebook).id,
  );
  assert.notEqual(
    publicReference("facebook", fixtures.facebook).id,
    publicReference("facebook", fixtures.facebook.replace("789", "790")).id,
  );
  assert.notEqual(
    publicReference("marathonsworld", fixtures.marathonsworld).id,
    publicReference("marathonsworld", fixtures.marathonsworld.replace("123456", "123457")).id,
  );
  assert.equal(
    new URL(publicReference("blog", "https://m.fictional.example/race").url).hostname,
    "m.fictional.example",
  );
  const article = "https://m.fictional.example/race/?b=2&a=1#comment-3";
  assert.equal(publicReference("blog", article).url, article);
});

test("posting date, event-page year and collection target stay independent", () => {
  const store = new ManualStore(":memory:", "manual", { multiSource: true });
  try {
    const saved = store.import(input());
    const raw = store.report(saved.batch_id).posts[0].raw;
    assert.equal(raw.timestamp, null);
    assert.equal(raw.event_page_year, 2025);
    assert.equal(raw.race_group, "半馬");
    assert.equal(raw.runner_segment, "unknown");
    assert.equal(raw.source_verified, false);
    assert.equal(store.import(input()).status, "already_imported");
    assert.equal(
      store.import(
        input("marathonsworld", {
          posted_date: "2025-02-01",
          runner_segment: "front",
          experience: "self_reported",
        }),
      ).status,
      "new_version",
    );
    const exported = store.exportRaw(saved.batch_id);
    assert.equal(exported.observations.length, 2);
    assert.equal(exported.observations[0].original.posted_date, null);
    assert.equal(exported.observations[1].original.posted_date, "2025-02-01");
    for (const bad of ["2025-02-30", "2025-1-5", "yesterday", "2025-01-05T00:00:00Z"])
      assert.throws(() => store.import(input("marathonsworld", { posted_date: bad })));
  } finally {
    store.close();
  }
});

test("root-only observations retain provenance and distinct authors/text", () => {
  const store = new ManualStore(":memory:", "manual", { multiSource: true });
  try {
    const data = input("youtube", {
      kind: "comment",
      source_url: "https://youtube.com/watch?v=ABCDEFGHIJK",
      link_scope: "root",
    });
    const first = store.import(data);
    store.import({ ...data, username: "another-fictional" });
    const report = store.report(first.batch_id);
    assert.equal(report.comments.length, 2);
    assert.equal(report.comments[0].raw.permalink, null);
    assert.equal(report.comments[0].raw.link_scope, "root");
    assert.equal(report.comments[0].parent_id, null);
  } finally {
    store.close();
  }
});

test("separate persistent workspaces preserve old Threads evidence and multi-source history", () => {
  const dir = mkdtempSync(join(tmpdir(), "comment-research-"));
  try {
    const path = join(dir, "multi.sqlite");
    let store = new ManualStore(path, "manual", { multiSource: true });
    store.import(input());
    store.close();
    assert.throws(() => new ManualStore(path));
    store = new ManualStore(path, "manual", { multiSource: true });
    assert.equal(store.batches()[0].items, 1);
    store.close();
    assert.throws(() => new ManualStore(path, "demo", { multiSource: true }));
    const old = join(dir, "old.sqlite");
    store = new ManualStore(old);
    store.close();
    assert.throws(() => new ManualStore(old, "manual", { multiSource: true }));
    const opts = parseImportOptions(["--multi-source"]);
    assert.match(
      opts.db.replaceAll("\\", "/"),
      /\.editorial-private\/research\/comments\/manual.sqlite$/,
    );
    assert.notEqual(opts.db, parseImportOptions([]).db);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("multi-source interface has search handoff and scope fields without broadening legacy UI", () => {
  const html = renderManualImport("manual", "fixture-token", { multiSource: true });
  for (const label of [
    "Marathon’s World",
    "Facebook 公開帖",
    "Instagram 公開帖",
    "YouTube",
    "運動筆記",
    "個人網誌",
    "posted_date",
    "runner_segment",
    "event_page_year",
  ])
    assert.ok(html.includes(label));
  assert.ok(html.includes("不會自動抓取"));
  assert.ok(!renderManualImport("manual", "fixture-token").includes('name="source_platform"'));
  for (const [, script] of html.matchAll(/<script>([\s\S]*?)<\/script>/g)) new Script(script);
});
