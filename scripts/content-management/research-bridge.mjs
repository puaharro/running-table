import { cleanReport } from "../threads/clean.mjs";
import { materials } from "./materials.mjs";
import { ReviewError } from "../threads/review-store.mjs";
const fail = (status, message) => {
  throw new ReviewError(status, message);
};
const exact = (v, keys) => {
  if (
    !v ||
    typeof v !== "object" ||
    Array.isArray(v) ||
    Object.keys(v).sort().join() !== keys.sort().join()
  )
    fail(400, "研究操作欄位不正確。");
};
export class ResearchBridge {
  constructor(content, store, reviews) {
    Object.assign(this, { content, store, reviews });
    content.db.exec(
      `CREATE TABLE IF NOT EXISTS agent_research_links(material_id TEXT PRIMARY KEY REFERENCES content_materials(id),payload_json TEXT NOT NULL)`,
    );
  }
  links() {
    return this.content.db
      .prepare("SELECT payload_json FROM agent_research_links ORDER BY material_id")
      .all()
      .map((r) => JSON.parse(r.payload_json));
  }
  ready() {
    if (!this.store?.multiSource || !this.reviews) fail(503, "需要原有多來源研究工作區。");
  }
  prepare(input) {
    this.ready();
    exact(input, ["material_ids"]);
    const ids = input.material_ids;
    if (
      !Array.isArray(ids) ||
      !ids.length ||
      ids.length > 100 ||
      new Set(ids).size !== ids.length ||
      ids.some((id) => typeof id !== "string")
    )
      fail(400, "請選1–100則不同材料。");
    const all = new Map(materials(this.content).map((m) => [m.id, m]));
    const selected = ids.map((id) => all.get(id) ?? fail(404, "找不到私人材料。"));
    const imported = selected.map((m) => {
      const preset =
        m.race_id === "hzmb-half-marathon-2026"
          ? "hzmb-half"
          : m.race_id === "standard-chartered-hk-marathon-2027"
            ? "hk-marathon"
            : `catalog:${m.race_id}`;
      // Root-only local observations retain multiple excerpts of one source. They are
      // never invented platform comment IDs, authors, or independent runner votes.
      const record = this.store.import({
        preset,
        target_year: m.year,
        kind: "comment",
        text: m.text,
        source_url: m.url,
        link_scope: "root",
        root_url: "",
        parent_relation: "unknown",
        parent_url: "",
        username: "",
        note: `AI材料橋接；私人材料 ${m.id}；來源短摘（非完整原文／非平台留言ID）。${m.scope}`.slice(
          0,
          2000,
        ),
        source_platform: m.platform,
        posted_date: m.posted_at ?? "",
        race_group: m.group,
        runner_segment: "unknown",
        experience: "unknown",
        event_page_year: null,
      });
      return { material: m, ...record, preset };
    });
    const datasets = new Map();
    for (const row of imported) {
      if (datasets.has(row.batch_id)) continue;
      const cleaned = cleanReport(this.store.report(row.batch_id), row.preset);
      const id = this.reviews.register(cleaned);
      this.store.remember(row.batch_id, id);
      datasets.set(row.batch_id, { id, cleaned });
    }
    return {
      links: imported.map((row) => {
        const { id: dataset_id, cleaned } = datasets.get(row.batch_id);
        const record_key = `comment:${row.source_id}`;
        const record = cleaned.records.find((r) => r.key === record_key);
        const link = {
          material_id: row.material.id,
          race_id: row.material.race_id,
          year: row.material.year,
          batch_id: row.batch_id,
          dataset_id,
          record_key,
          clean_url: `/clean/${dataset_id}`,
          review_url: `/review/${dataset_id}`,
          automatic: record.disposition,
          reasons: record.reasons ?? [],
          source_url: row.material.url,
        };
        this.content.db
          .prepare(
            "INSERT INTO agent_research_links VALUES(?,?) ON CONFLICT(material_id) DO UPDATE SET payload_json=excluded.payload_json",
          )
          .run(link.material_id, JSON.stringify(link));
        return link;
      }),
    };
  }
  context(input) {
    this.ready();
    exact(input, ["material_id"]);
    const link = this.links().find((l) => l.material_id === input.material_id);
    if (!link) fail(404, "材料尚未接入原有研究流程。");
    const source = this.reviews.source(link.dataset_id);
    return {
      ...link,
      record: source.records.find((r) => r.key === link.record_key),
      decision:
        this.reviews
          .state(link.dataset_id)
          .decisions.find((r) => r.record_key === link.record_key) ?? null,
      history: this.reviews.history(link.dataset_id, link.record_key),
    };
  }
  review(input, request, requestHash) {
    this.ready();
    exact(input, ["material_id", "decision", "note", "expected_revision"]);
    const ctx = this.context({ material_id: input.material_id });
    const note = `AI研究覆核；非人手確認或發布批准。${input.note}`;
    const last = ctx.history[0];
    // Recover a completed research-DB write if the separate content audit failed.
    if (last?.actor?.request_key === request.idempotency_key) {
      if (
        last.actor.request_hash !== requestHash ||
        last.note !== note ||
        last.decision !== input.decision
      )
        fail(409, "研究重試內容不同。");
      return { ...ctx, decision: ctx.decision };
    }
    if (ctx.decision && ctx.decision.actor?.type !== "agent") fail(403, "AI不能覆寫人手研究決定。");
    if (typeof input.note !== "string" || !input.note.trim())
      fail(400, "逐條覆核需要理由及觀察限制。");
    const result = this.reviews.save(
      ctx.dataset_id,
      {
        record_key: ctx.record_key,
        decision: input.decision,
        race_name: this.reviews.source(ctx.dataset_id).target.name,
        event_year: ctx.year,
        note,
        expected_revision: input.expected_revision,
      },
      {
        actor: {
          type: "agent",
          ...request.agent,
          request_key: request.idempotency_key,
          request_hash: requestHash,
          reason: request.reason,
        },
      },
    );
    return { ...ctx, ...result };
  }
}
