import { test, expect } from "vitest";
import { publicHash, validateRuntimeRecord } from "./cms-runtime-schema.mjs";
const record = (id: string) => ({
  manifest: {
    source_website_id: "website-12345678-1234-1234-1234-123456789abc",
    source_revision: 3,
    source_content_hash: "a".repeat(64),
    public_content_hash: "",
  },
  public_copy: {
    race_id: id,
    year: 2028,
    title: "虛構測試賽事",
    sections: ["賽道", "補給", "寄存", "交通", "大會安排"].map((topic) => ({
      topic,
      body: "未知。",
      limitations: "虛構測試，無參賽證據。",
      urls: ["https://example.com/source"],
    })),
  },
});
test("different races use the same confirmed copy adapter without race-specific code", () => {
  for (const id of ["fictional-race-a", "fictional-race-b"]) {
    const r = record(id);
    r.manifest.public_content_hash = publicHash(r.public_copy);
    const pin = { hash: publicHash(r), format: "five-topic-v1" };
    expect(validateRuntimeRecord(r, pin, id).markdown).toContain("未知。");
    expect(validateRuntimeRecord(r, pin, id).revision).toBe(3);
    expect(() =>
      validateRuntimeRecord({ ...r, public_copy: { ...r.public_copy, title: "Changed" } }, pin, id),
    ).toThrow();
    expect(() => validateRuntimeRecord(r, pin, "other-race")).toThrow();
  }
});
test("private fields, unsafe links and incomplete or internal copy fail closed", () => {
  for (const change of [
    (r: any) => (r.public_copy.private_evidence = "fixture"),
    (r: any) => (r.public_copy.sections[0].urls = ["javascript:alert(1)"]),
    (r: any) => (r.public_copy.title = "候選・待確認"),
    (r: any) => r.public_copy.sections.pop(),
  ]) {
    const r = record("fictional-race");
    change(r);
    r.manifest.public_content_hash = publicHash(r.public_copy);
    expect(() =>
      validateRuntimeRecord(r, { hash: publicHash(r), format: "five-topic-v1" }, "fictional-race"),
    ).toThrow();
  }
});
