import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { ContentStore } from "../scripts/content-management/store.mjs";
import { Workflow, TOPICS, newWorkflowId } from "../scripts/content-management/workflow.mjs";
import { Releases, releasePage } from "../scripts/content-management/releases.mjs";

test("release staging requires exact confirmation, retains audit and invalidates checks on changes", () => {
  const c = new ContentStore(":memory:", "demo"),
    w = new Workflow(c),
    s = new Releases(c);
  try {
    const id = newWorkflowId("website");
    let r = w.save({
      id,
      expected_revision: 0,
      kind: "website",
      data: {
        race_id: c.catalog[0].id,
        year: 2025,
        title: "虛構測試網站稿",
        draft_id: null,
        sections: TOPICS.map((topic) => ({
          topic,
          body: "未知。",
          limitations: "虛構測試資料",
          urls: [],
        })),
      },
    });
    assert.throws(() => s.prepare({ id, expected_revision: 1 }));
    w.confirm({
      id,
      expected_revision: 1,
      content_hash: w.hash(r),
      acknowledge: true,
      allow_incomplete: true,
      note: "僅為虛構測試的確認",
    });
    const release = s.prepare({ id, expected_revision: 1 });
    assert.equal(s.prepare({ id, expected_revision: 1 }).id, release.id);
    assert.equal(release.payload.publication_approved, false);
    assert.equal(release.payload.existing_confirmed_display, null);
    assert.match(s.preview(release.id), /未知/);
    assert.match(releasePage(c, "fake", id), /驗收/);
    const input = {
      release_id: release.id,
      expected_revision: 1,
      kind: "browser",
      status: "limited",
      checked_at: new Date().toISOString(),
      notes: "僅尺寸模擬",
      reference: "私人報告參考",
    };
    assert.equal(s.record(input).checks[0].status, "limited");
    assert.throws(() => s.record({ ...input, publication_approved: true }));
    assert.throws(() => s.record({ ...input, expected_revision: 2 }));
    r = w.save({
      id,
      expected_revision: 1,
      kind: "website",
      data: { ...r.data, title: "另一份虛構修訂" },
    });
    assert.equal(s.current(s.get(release.id)), false);
    assert.throws(() => s.preview(release.id));
    assert.throws(() => s.record(input));
    assert.equal(s.get(release.id).checks.length, 1);
  } finally {
    c.close();
  }
});

test("existing approved display and ratings survive staging unchanged", () => {
  const c = new ContentStore(":memory:", "demo"),
    w = new Workflow(c),
    s = new Releases(c);
  try {
    const p = JSON.parse(
      readFileSync(
        new URL("../content/race-experiences/hzmb-half-2025.json", import.meta.url),
        "utf8",
      ),
    );
    const data = {
      race_id: p.raceId,
      year: p.year,
      title: p.title,
      sections: p.sections,
      draft_id: null,
    };
    let r = w.save({ id: p.sourceWebsiteId, expected_revision: 0, kind: "website", data });
    r = w.save({ id: r.id, expected_revision: 1, kind: "website", data });
    w.confirm({
      id: r.id,
      expected_revision: 2,
      content_hash: w.hash(r),
      acknowledge: true,
      allow_incomplete: true,
      note: "Fictional test confirmation only",
    });
    const release = s.prepare({ id: r.id, expected_revision: 2 });
    assert.deepEqual(release.payload.existing_confirmed_display, p);
    assert.deepEqual(release.payload.manifest.scores, { course: 3, organization: 4, aid: 3 });
    assert.equal(release.payload.publication_approved, false);
  } finally {
    c.close();
  }
});
