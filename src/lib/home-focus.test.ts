import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { HomeFocusBanner } from "@/components/home-focus-banner";
import { homeFocusSlides } from "@/data/home-focus";

it("provides editorial banner controls without implying sponsorship", () => {
  const html = renderToStaticMarkup(
    createElement(HomeFocusBanner, {
      slides: homeFocusSlides,
      initialNow: "2026-11-01T12:00:00+08:00",
    }),
  );
  expect(html).toContain("渣打香港馬拉松 2027");
  expect(html).toContain('aria-label="選擇焦點內容"');
  expect(html).toContain('aria-label="顯示第 2 張：');
  expect(html).not.toContain('aria-label="下一張焦點"');
  expect(html).not.toContain('aria-label="上一張焦點"');
  expect(html).toContain('aria-roledescription="輪播"');
  expect(html).toContain("inert");
  expect(html).not.toContain("贊助 ·");
});

it("removes expired event promotions while retaining the evergreen guide", () => {
  const html = renderToStaticMarkup(
    createElement(HomeFocusBanner, {
      slides: homeFocusSlides,
      initialNow: "2028-01-01T12:00:00+08:00",
    }),
  );
  expect(html).not.toContain("渣打香港馬拉松 2027");
  expect(html).not.toContain("港珠澳大橋（香港段）半馬拉松 2026");
  expect(html).toContain("第一場 10K");
});
