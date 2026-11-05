import { test } from "node:test";
import assert from "node:assert/strict";
import { Script } from "node:vm";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative, resolve, isAbsolute } from "node:path";
import { comparisonFixture } from "./fixtures/threads-comparison.mjs";
import { ReviewStore } from "../scripts/threads/review-store.mjs";
import { renderVerification } from "../scripts/threads/verification-view.mjs";
import { verificationCsv } from "../scripts/threads/verification-store.mjs";

function fixture(t, paths = {}) {
  const f = comparisonFixture(paths);
  t?.after(f.close);
  const note = (verification = "【虛構測試】核對是否同一組別。") => {
    const c = f.reviews.comparison(...f.ids),
      row = c.rows[0];
    f.reviews.saveComparisonNote({
      left: f.ids[0],
      right: f.ids[1],
      selection: c.selection,
      note_topic: "transport",
      differences: "【虛構測試】非使用者覆核。",
      verification,
      expected_revision: row.manual_note?.revision ?? 0,
      expected_evidence_digest: row.evidence_digest,
      expected_comparison_fingerprint: c.comparison_fingerprint,
    });
    return row.note_id;
  };
  const noteId = note(),
    state = () => f.reviews.verificationState(f.ids, noteId);
  const input = (extra = {}) => {
    const s = state(),
      old = s.tasks.find((t) => t.id === "a".repeat(64));
    return {
      id: "a".repeat(64),
      note_id: noteId,
      title: "【虛構測試】核對接駁是否同一組別。",
      status: "pending",
      result: "",
      sources: [],
      checked_on: "",
      expected_revision: old?.revision ?? 0,
      expected_note_revision: s.basis.note_revision,
      expected_evidence_digest: s.basis.evidence_digest,
      ...extra,
    };
  };
  return {
    ...f,
    noteId,
    note,
    state,
    input,
    save: (extra) => f.reviews.saveVerification(input(extra), f.ids),
  };
}
test("individual verification lifecycle preserves source receipts, independent tasks and append-only history", (t) => {
  const f = fixture(t);
  assert.equal(f.state().tasks.length, 0);
  f.save();
  f.save({ status: "in_progress", result: "【虛構測試】整理官方資料中。" });
  f.save({
    status: "verified",
    result: "【虛構測試】測試完成，非真實核實。",
    sources: ["https://example.invalid/fictional-record"],
    checked_on: "2026-11-02",
  });
  let s = f.state();
  assert.equal(s.counts.verified, 1);
  assert.equal(s.tasks[0].history.length, 3);
  assert.ok(
    s.tasks[0].history[0].basis.row.left.points[0].evidence.original_text.includes("虛構測試"),
  );
  f.save({ status: "unable", result: "【虛構測試】沒有足夠資料。", checked_on: "2026-11-02" });
  assert.equal(f.state().counts.unable, 1);
  f.save();
  assert.equal(f.state().counts.pending, 1);
  assert.equal(f.state().tasks[0].history.length, 5);
  f.save({ id: "b".repeat(64), expected_revision: 0, title: "【虛構測試】第二項獨立事項" });
  assert.equal(f.state().tasks.length, 2);
  assert.equal(f.reviews.comparison(...f.ids).rows[0].manual_note.revision, 1);
});
test("verified and unable statuses require deliberate supporting records; links and calendar dates are validated", (t) => {
  const f = fixture(t);
  for (const extra of [
    { status: "verified" },
    { status: "verified", result: "測試", checked_on: "2026-11-02" },
    { status: "unable" },
    { checked_on: "2026-02-30" },
    { checked_on: "nonsense" },
    { sources: ["javascript:alert(1)"] },
    { sources: ["http://example.invalid"] },
    { sources: ["https://user:pass@example.invalid/"] },
    { sources: Array(6).fill("https://example.invalid") },
    { title: "" },
    { status: "approved" },
    { title: "x".repeat(2001) },
    { result: "x".repeat(4001) },
    { score: 5 },
  ])
    assert.throws(() => f.save(extra), { status: 400 });
  assert.equal(f.state().tasks.length, 0);
  f.save({
    sources: ["https://example.invalid/test", "https://example.invalid/test"],
    checked_on: "2024-02-29",
  });
  assert.equal(f.state().tasks[0].sources.length, 1);
});
test("revision and note/evidence conflicts cannot overwrite a newer task or move it to another note", (t) => {
  const f = fixture(t),
    first = f.input();
  f.save();
  assert.throws(() => f.reviews.saveVerification(first, f.ids), { status: 409 });
  assert.throws(() => f.save({ expected_note_revision: 0 }), { status: 409 });
  assert.throws(() => f.save({ expected_evidence_digest: "0".repeat(64) }), { status: 409 });
  assert.equal(f.state().tasks[0].history.length, 1);
  assert.throws(() => f.reviews.saveVerification(f.input(), [f.ids[0]]), { status: 404 });
  assert.equal(f.reviews.verificationState([f.ids[0]]).tasks.length, 0);
});
test("upstream note changes mark completed records for recheck and remove them from verified totals", (t) => {
  const f = fixture(t),
    verified = {
      status: "verified",
      result: "【虛構測試】非真實核實。",
      sources: ["https://example.invalid/test"],
      checked_on: "2026-11-02",
    };
  f.save(verified);
  f.note("【虛構測試】新增需核對站點。");
  let s = f.state();
  assert.equal(s.tasks[0].status, "verified");
  assert.equal(s.tasks[0].needs_recheck, true);
  assert.equal(s.counts.verified, 0);
  assert.equal(s.counts.needs_recheck, 1);
  f.save(verified);
  s = f.state();
  assert.equal(s.tasks[0].needs_recheck, false);
  assert.equal(s.tasks[0].history.length, 2);
});
test("changed source summary blocks verified status until comparison note has been reviewed again", (t) => {
  const f = fixture(t);
  f.save();
  f.save({ status: "in_progress" }); // Existing fixture helper changes a real stored summary revision, not raw evidence.
  const c = f.reviews.comparison(...f.ids),
    p = c.rows[0].left.points[0];
  f.reviews.saveSummary(f.ids[0], {
    point_id: p.id,
    status: "confirmed",
    text: "【虛構測試】摘要修改。",
    note: "【虛構測試】",
    expected_revision: 0,
    expected_evidence_digest: p.evidence_digest,
    expected_summary_fingerprint: c.sources.left.summary_fingerprint,
  });
  assert.equal(f.state().basis.note_status, "stale");
  assert.throws(
    () =>
      f.save({
        status: "verified",
        result: "【虛構測試】",
        sources: ["https://example.invalid"],
        checked_on: "2026-11-02",
      }),
    { status: 409 },
  );
  f.note();
  f.save({ status: "in_progress" });
  assert.equal(f.state().tasks[0].needs_recheck, false);
});
test("task and audit record roll back together when history write fails", (t) => {
  const f = fixture(t);
  f.reviews.db.exec(
    "CREATE TRIGGER fail_verification BEFORE INSERT ON verification_events BEGIN SELECT RAISE(ABORT,'fictional failure'); END;",
  );
  assert.throws(() => f.save(), /fictional failure/);
  assert.equal(f.state().tasks.length, 0);
});
test("disk reopening restores tasks, source references and histories", () => {
  const dir = mkdtempSync(join(tmpdir(), "nxtgo-verification-"));
  let f;
  try {
    const reviewPath = join(dir, "review.sqlite");
    f = fixture(null, { reviewPath, manualPath: join(dir, "manual.sqlite") });
    f.save();
    const ids = f.ids,
      noteId = f.noteId;
    f.close();
    f = null;
    const store = new ReviewStore(reviewPath);
    try {
      const s = store.verificationState(ids, noteId);
      assert.equal(s.tasks[0].history.length, 1);
      assert.equal(s.tasks[0].title.includes("虛構測試"), true);
    } finally {
      store.close();
    }
  } finally {
    f?.close();
    const rel = relative(resolve(tmpdir()), resolve(dir));
    assert.ok(rel && !rel.startsWith("..") && !isAbsolute(rel));
    rmSync(dir, { recursive: true, force: true });
  }
});
test("tracker exports and HTML preserve evidence, escape text and split multiline supplemental sources correctly", (t) => {
  const f = fixture(t);
  f.save({
    title: "<script>alert(1)</script>",
    result: "=SUM(A1)",
    sources: ["https://example.invalid/a", "https://example.invalid/b"],
  });
  const data = f.state(),
    html = renderVerification(data, { token: "fake", taskId: data.tasks[0].id });
  assert.ok(html.includes("&lt;script&gt;alert(1)&lt;/script&gt;"));
  assert.ok(!html.includes("<script>alert(1)</script>"));
  const script = html.match(/<script>([\s\S]*)<\/script>/)[1];
  new Script(script);
  const regex = new Function("return " + script.match(/input.sources.split\((\/.*?\/)\)/)[1])();
  assert.equal("https://example.invalid/a\r\nhttps://example.invalid/b".split(regex).length, 2);
  const csv = verificationCsv(data);
  assert.ok(csv.includes("'=SUM(A1)"));
  assert.ok(csv.includes("COMPARE_2026"));
  assert.equal(JSON.parse(JSON.stringify(data)).tasks[0].history.length, 1);
});
test("saving an existing task refreshes its revision even when the destination URL is unchanged", async (t) => {
  const f = fixture(t);
  f.save();
  const data = f.state(),
    task = data.tasks[0],
    html = renderVerification(data, { token: "fake", taskId: task.id });
  const script = new Script(html.match(/<script>([\s\S]*)<\/script>/)[1]);
  const listeners = {},
    message = {},
    form = {
      dataset: { dirty: "true" },
      elements: [{}],
      querySelector: () => message,
      addEventListener: (name, fn) => (listeners[name] = fn),
    };
  const values = {
    id: task.id,
    note_id: f.noteId,
    title: task.title,
    status: "in_progress",
    result: "【虛構測試】",
    sources: "https://example.invalid/a\nhttps://example.invalid/b",
    checked_on: "",
    expected_revision: "1",
    expected_note_revision: "1",
    expected_evidence_digest: data.basis.evidence_digest,
  };
  const url = new URL("http://127.0.0.1:9999/verification");
  url.searchParams.set("note", f.noteId);
  url.searchParams.set("task", task.id);
  url.hash = "editor";
  let reloaded = 0,
    assigned = 0,
    sent;
  script.runInNewContext({
    document: {
      querySelector: (selector) =>
        selector === "#task-form"
          ? form
          : {
              content: selector.includes("task-base")
                ? "/verification"
                : selector.includes("task-api")
                  ? "/verification-save"
                  : "fake",
            },
    },
    window: { addEventListener: () => {} },
    FormData: class {
      [Symbol.iterator]() {
        return Object.entries(values)[Symbol.iterator]();
      }
    },
    URL,
    location: { href: url.href, reload: () => reloaded++, assign: () => assigned++ },
    fetch: async (path, options) => {
      sent = JSON.parse(options.body);
      return { ok: true, json: async () => ({ id: task.id, revision: 2 }) };
    },
  });
  await listeners.submit({ preventDefault: () => {} });
  assert.equal(reloaded, 1);
  assert.equal(assigned, 0);
  assert.equal(form.dataset.dirty, "false");
  assert.equal(sent.sources.length, 2);
});
