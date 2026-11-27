import { test } from "node:test";
import assert from "node:assert/strict";
import { ContentStore } from "../scripts/content-management/store.mjs";
import { Workflow, newWorkflowId, TOPICS } from "../scripts/content-management/workflow.mjs";
import { prepareRuntimeRecord } from "../scripts/content-management/runtime.mjs";
import { renderWebsite } from "../scripts/content-management/workflow-view.mjs";
import { validateRuntimeRecord } from "../src/lib/cms-runtime-schema.mjs";
test("generic CMS export requires exact human confirmation, strips private fields and invalidates after source change", () => {
  const c = new ContentStore(":memory:", "demo"),
    w = new Workflow(c);
  try {
    const race = c.catalog[1];
    const year = Number(race.date.slice(0, 4));
    const v = w.save({
      id: newWorkflowId("website"),
      kind: "website",
      expected_revision: 0,
      data: {
        race_id: race.id,
        year,
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
    const groupId = race.groups[0].id;
    assert.throws(() => prepareRuntimeRecord(c, v.id, 1, "wrong-group"));
    const { record, hash } = prepareRuntimeRecord(c, v.id, 1, groupId);
    const preview = renderWebsite(c, "fixture", { id: v.id, groupId });
    assert.match(preview, /<summary>選稿及差異預覽<\/summary>/);
    assert.ok(preview.includes(`${hash} --group ${groupId}`));
    assert.ok(preview.includes(`--year ${year} --group ${groupId} --revision 1`));
    assert.deepEqual(Object.keys(record).sort(), ["group_id", "manifest", "public_copy"]);
    assert.throws(() =>
      validateRuntimeRecord(
        record,
        { hash, format: "five-topic-v1", groupId: "wrong-group" },
        race.id,
        year,
      ),
    );
    assert.equal(
      validateRuntimeRecord(record, { hash, format: "five-topic-v1", groupId }, race.id, year)
        .raceId,
      race.id,
    );
    assert.throws(() => prepareRuntimeRecord(c, v.id, 2));
    w.save({
      id: `coverage:${race.id}:${year}:blog`,
      kind: "coverage",
      expected_revision: 0,
      data: {
        race_id: race.id,
        year,
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
