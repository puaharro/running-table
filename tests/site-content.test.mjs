import { describe, it, expect } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { RaceConfirmedExperience } from "../src/components/confirmed-race-experience.tsx";
import { checkContent, contentTargets } from "../scripts/site-qa/content.mjs";
import { options } from "../scripts/check-site-content.mjs";

const targets = contentTargets();
const render = (record) =>
  renderToStaticMarkup(
    createElement(RaceConfirmedExperience, {
      experience: record,
      currentYear: record.raceId.match(/\d{4}$/)[0],
    }),
  );
describe("confirmed content regression check", () => {
  for (const { record } of targets) {
    it(`accepts current rendered ${record.raceId}`, () => {
      expect(checkContent(render(record), record).topics).toBe(5);
    });
  }
  const record = targets[0].record;
  it("rejects changed body, unknowns, limitations and complete comments", () => {
    for (const text of [
      record.sections[0].body,
      record.sections[2].body,
      record.sections[0].limitations,
      record.assessments.course.comment,
    ]) {
      expect(() => checkContent(render(record).replaceAll(text, "遺漏內容"), record)).toThrow();
    }
  });
  it("rejects scores swapped between dimensions despite the same set of numbers", () => {
    const html = render(record)
      .replace("<strong>3 / 5</strong>", "<strong>SWAP</strong>")
      .replace("<strong>4 / 5</strong>", "<strong>3 / 5</strong>")
      .replace("SWAP", "4 / 5");
    expect(() => checkContent(html, record)).toThrow(/scores/);
  });
  it("rejects unapproved baseline changes rather than accepting matching changed HTML", () => {
    const changed = structuredClone(record);
    changed.assessments.course.score = 5;
    expect(() => checkContent(render(changed), changed)).toThrow(/renewed confirmation/);
  });
  it("rejects moving a source into another topic", () => {
    const html = render(record);
    const [first, second] = [...html.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
    expect(() =>
      checkContent(
        html.replace(first, "SWAP").replace(second, first).replace("SWAP", second),
        record,
      ),
    ).toThrow(/sources/);
  });
  it("rejects turning unassessed into zero and private preview markup", () => {
    const r = targets[1].record;
    expect(() =>
      checkContent(render(r).replace("<strong>未評</strong>", "<strong>0 / 5</strong>"), r),
    ).toThrow(/scores/);
    expect(() =>
      checkContent(render(r) + '<aside id="rating-assessment-preview">private</aside>', r),
    ).toThrow(/private/);
  });
  it("rejects login HTML and missing sections", () => {
    expect(() => checkContent("<h1>Sign in</h1>", record)).toThrow();
    expect(() =>
      checkContent(render(record).replace('id="race-confirmed-experience"', 'id="wrong"'), record),
    ).toThrow();
  });
  it("keeps HTTP checks explicit and rejects embedded credentials or conflicting modes", () => {
    expect(options(["--base-url", "http://127.0.0.1:3000"])).toEqual({
      base: "http://127.0.0.1:3000",
    });
    for (const args of [
      ["--base-url", "https://user:secret@example.test"],
      ["--base-url", "https://example.test/?token=x"],
      ["--directory", "out", "--base-url", "https://example.test"],
      ["--unknown"],
    ])
      expect(() => options(args)).toThrow();
  });
});

// Exercise the user-facing process contract, not just the validator function.
it("CLI returns nonzero for missing full text without printing the paragraph", () => {
  const dir = mkdtempSync(join(tmpdir(), "nxtgo-content-qa-"));
  try {
    for (const target of targets) {
      const destination = join(dir, target.path);
      mkdirSync(dirname(destination), { recursive: true });
      writeFileSync(destination, render(target.record));
    }
    const cli = fileURLToPath(new URL("../scripts/check-site-content.mjs", import.meta.url));
    const invoke = () =>
      spawnSync(process.execPath, [cli, "--directory", dir], { encoding: "utf8" });
    expect(invoke().status).toBe(0);
    const target = targets[0];
    writeFileSync(
      join(dir, target.path),
      render(target.record).replaceAll(target.record.sections[0].body, "PRIVATE_TEST_SENTINEL"),
    );
    const failed = invoke();
    expect(failed.status).toBe(1);
    expect(failed.stderr).toContain("FAIL");
    expect(failed.stderr).not.toContain("PRIVATE_TEST_SENTINEL");
    expect(failed.stderr).not.toContain(target.record.sections[0].body);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

it("rejects missing historical warning even when the title still includes 2025", () => {
  const r = targets[0].record;
  const html = render(r).replace(/<p class="review-edition-note">[\s\S]*?<\/p>/, "");
  expect(() => checkContent(html, r)).toThrow(/edition note/);
});
