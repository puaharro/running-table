import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { cleanReport, cleaningDemo } from "../scripts/threads/clean.mjs";
import { ReviewStore } from "../scripts/threads/review-store.mjs";
import { buildConfirmed, confirmedCsv } from "../scripts/threads/confirmed.mjs";
import { renderConfirmed } from "../scripts/threads/confirmed-view.mjs";

async function fixture(t, edit = () => {}) {
  const source = cleanReport(await cleaningDemo(), "hk-marathon");
  edit(source);
  const store = new ReviewStore(":memory:");
  t.after(() => store.close());
  const id = store.register(source);
  const keep = (key, extra = {}) =>
    store.save(id, {
      record_key: key,
      decision: "keep",
      race_name: "渣打香港馬拉松",
      event_year: 2026,
      note: "【虛構測試】非使用者覆核。",
      expected_revision: 0,
      ...extra,
    });
  return { store, id, keep, source, result: () => buildConfirmed(store.export(id)) };
}
function duplicate(source, text) {
  const record = structuredClone(source.records.find((row) => row.key === "comment:101"));
  record.key = "post:101";
  record.kind = "post";
  if (text !== undefined) record.raw.text = text;
  source.records.push(record);
}

test("only explicit saved manual keeps enter the dataset; automatic decisions never substitute", async (t) => {
  const f = await fixture(t);
  assert.equal(f.result().records.length, 0);
  assert.equal(f.result().summary.merged_observations, 0);
  assert.equal(f.result().summary.pending, 11);
  f.keep("comment:101");
  f.keep("comment:102", { decision: "exclude" });
  f.keep("comment:103", { decision: "pending" });
  const result = f.result();
  assert.equal(result.summary.confirmed_keep, 1);
  assert.equal(result.summary.confirmed_exclude, 1);
  assert.equal(result.summary.pending, 9);
  assert.equal(result.records.length, 1);
  const exported = f.store.export(f.id),
    before = JSON.stringify(exported);
  buildConfirmed(exported);
  assert.equal(JSON.stringify(exported), before);
});

test("uses corrected race and year, not the original batch target", async (t) => {
  const f = await fixture(t);
  f.keep("comment:101", { race_name: "美津濃香港跑步祭", event_year: 2026 });
  const result = f.result();
  assert.equal(result.groups[0].race_key, "mizuno-run-fest");
  assert.equal(result.groups[0].event_year, 2026);
  assert.equal(result.records[0].race_name, "美津濃香港跑步祭");
  assert.equal(f.source.run.target_year, 2027);
});

test("missing confirmed metadata stays pending attention without inferred labels", async (t) => {
  const f = await fixture(t);
  f.keep("comment:104", { race_name: "", event_year: null });
  const result = f.result();
  assert.equal(result.summary.confirmed_keep, 1);
  assert.equal(result.records.length, 0);
  assert.ok(result.needs_attention[0].reasons.includes("missing_confirmed_race"));
  assert.ok(result.needs_attention[0].reasons.includes("missing_confirmed_year"));
  assert.equal(result.needs_attention[0].observations[0].manual.event_year, null);
});

test("same source identity merges observations and retains all original reviews", async (t) => {
  const f = await fixture(t, duplicate);
  f.keep("comment:101");
  f.keep("post:101", { race_name: "渣馬" });
  const result = f.result();
  assert.equal(result.summary.confirmed_keep, 2);
  assert.equal(result.records.length, 1);
  assert.equal(result.summary.merged_observations, 1);
  assert.equal(result.records[0].observations.length, 2);
  assert.equal(result.records[0].kind, "comment");
  assert.deepEqual(new Set(result.records[0].name_variants), new Set(["渣馬", "渣打香港馬拉松"]));
});

test("contradictory race/year or text versions for one identity block ready export", async (t) => {
  const f = await fixture(t, duplicate);
  f.keep("comment:101");
  f.keep("post:101", { event_year: 2027 });
  assert.equal(f.result().records.length, 0);
  assert.ok(f.result().needs_attention[0].reasons.includes("same_identity_assignment_conflict"));
  const g = await fixture(t, (source) => duplicate(source, "【虛構測試】後來的不同文字。"));
  g.keep("comment:101");
  g.keep("post:101");
  assert.equal(g.result().records.length, 0);
  assert.ok(g.result().needs_attention[0].reasons.includes("same_identity_text_conflict"));
});

test("different identities kept despite automatic duplicate suspicion remain separate with a warning", async (t) => {
  const f = await fixture(t);
  f.keep("comment:101");
  f.keep("comment:102");
  const result = f.result();
  assert.equal(result.records.length, 2);
  assert.equal(result.summary.merged_observations, 0);
  assert.ok(result.records.some((row) => row.warnings.includes("other_kept_duplicate_candidate")));
});

test("custom names are not claimed as a known Hong Kong preset", async (t) => {
  const f = await fixture(t);
  f.keep("comment:101", { race_name: "某場路跑（虛構自訂）" });
  const result = f.result();
  assert.equal(result.groups[0].known_hk_preset, false);
  assert.ok(result.records[0].warnings.includes("custom_race_region_unverified"));
});

test("manual source and root-only provenance remain explicit", async (t) => {
  const f = await fixture(t, (source) => {
    source.mode = "manual";
    const record = source.records.find((row) => row.key === "comment:101");
    record.raw.ingestion_method = "manual_paste";
    record.raw.manual_identity = "root_text_observation";
    record.raw.source_verified = false;
    record.raw.link_scope = "root";
    record.raw.permalink = null;
    record.permalink = null;
    record.raw.source_post_url = "https://www.threads.com/@fixture/post/FAKE";
  });
  f.keep("comment:101");
  const result = f.result(),
    record = result.records[0];
  assert.equal(result.mode, "manual");
  assert.equal(record.identity_basis, "local_text_observation");
  assert.equal(record.source_scope, "root");
  assert.ok(record.warnings.includes("manual_source_unverified"));
  assert.ok(record.warnings.includes("root_link_only"));
  assert.equal(record.observations[0].automatic.raw.source_verified, false);
});

test("review changes update the fingerprint and ready data without changing prior exports", async (t) => {
  const f = await fixture(t);
  f.keep("comment:101");
  const first = f.result(),
    bytes = JSON.stringify(first);
  assert.equal(f.result().review_fingerprint, first.review_fingerprint);
  f.keep("comment:101", { decision: "exclude", expected_revision: 1 });
  const second = f.result();
  assert.notEqual(second.review_fingerprint, first.review_fingerprint);
  assert.equal(second.records.length, 0);
  assert.equal(JSON.stringify(first), bytes);
});

test("CSV quotes multiline text and prevents spreadsheet formula execution while JSON stays exact", async (t) => {
  const f = await fixture(t, (source) => {
    const record = source.records.find((row) => row.key === "comment:101");
    record.raw.text = '=HYPERLINK("https://evil.example")\n"quoted"';
    record.clean_text = record.raw.text;
    record.username = "@fixture";
  });
  f.keep("comment:101", { race_name: " =DANGEROUS()" });
  const result = f.result(),
    csv = confirmedCsv(result);
  assert.ok(csv.startsWith("\uFEFF"));
  assert.ok(csv.includes("'=HYPERLINK("));
  assert.ok(csv.includes("'@fixture"));
  assert.ok(csv.includes('""quoted""'));
  assert.equal(result.records[0].original_text, '=HYPERLINK("https://evil.example")\n"quoted"');
  assert.equal(csv.split("\r\n")[0].includes("race_name"), true);
});

test("confirmed HTML escapes text and provides export links plus metadata attention", async (t) => {
  const f = await fixture(t, (source) => {
    source.records.find((row) => row.key === "comment:101").raw.text =
      "<img src=x onerror=alert(1)>";
  });
  f.keep("comment:101", { race_name: "<script>alert(2)</script>" });
  f.keep("comment:104", { event_year: null });
  const html = renderConfirmed(f.result(), {
    apiBase: "/api/reviews/" + f.id,
    reviewUrl: "/review/" + f.id,
    importNavigation: true,
  });
  assert.doesNotMatch(html, /<img|<script>alert/);
  assert.match(html, /全部是虛構測試資料/);
  assert.match(html, /尚未確認年份/);
  assert.ok(html.includes(`/api/reviews/${f.id}/confirmed.csv`));
  const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
  assert.ok(
    html.includes(`script-src 'sha256-${createHash("sha256").update(script).digest("base64")}'`),
  );
});
