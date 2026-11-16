import { test } from "node:test";
import assert from "node:assert/strict";
import { ContentStore } from "../scripts/content-management/store.mjs";
import { Workflow, newWorkflowId, TOPICS } from "../scripts/content-management/workflow.mjs";
import { prepareRuntimeRecord } from "../scripts/content-management/runtime.mjs";
import { validateRuntimeRecord } from "../src/lib/cms-runtime-schema.mjs";
test("generic CMS export requires exact human confirmation, strips private fields and invalidates after source change", () => {
  const c = new ContentStore(":memory:", "demo"),
    w = new Workflow(c);
  try {
    const race = c.catalog[1];
    const v = w.save({
      id: newWorkflowId("website"),
      kind: "website",
      expected_revision: 0,
      data: {
        race_id: race.id,
        year: 2025,
        title: "虛構通用接入測試",
        draft_id: null,
        sections: TOPICS.map((topic) => ({
          topic,
          body: "未知。",
          limitations: "虛構測試內容，不發布。",
          urls: [],
        })),
      },
    });
    assert.throws(() => prepareRuntimeRecord(c, v.id, 1));
    w.confirm({
      id: v.id,
      expected_revision: 1,
      content_hash: w.hash(v),
      acknowledge: true,
      allow_incomplete: true,
      note: "虛構測試人手確認；不批准發布",
    });
    const { record, hash } = prepareRuntimeRecord(c, v.id, 1);
    assert.deepEqual(Object.keys(record).sort(), ["manifest", "public_copy"]);
    assert.equal(
      validateRuntimeRecord(record, { hash, format: "five-topic-v1" }, race.id).raceId,
      race.id,
    );
    assert.throws(() => prepareRuntimeRecord(c, v.id, 2));
    w.save({
      id: `coverage:${race.id}:2025:blog`,
      kind: "coverage",
      expected_revision: 0,
      data: {
        race_id: race.id,
        year: 2025,
        platform: "blog",
        state: "searching",
        query: "虛構搜尋",
        checked_at: "",
        links: [],
        notes: "虛構",
      },
    });
    assert.throws(() => prepareRuntimeRecord(c, v.id, 1));
  } finally {
    c.close();
  }
});
