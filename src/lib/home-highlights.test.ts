import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { HomeHighlights } from "@/components/home-highlights";
import { races } from "@/data/races";

it("offers a real search form and the next three races in chronological order", () => {
  const html = renderToStaticMarkup(
    createElement(HomeHighlights, { races, initialNow: "2026-11-01T12:00:00+08:00" }),
  );
  expect(html).toContain('action="/races/"');
  expect(html).toContain('name="q"');
  const agenda = html.split('<ol class="home-agenda">')[1].split("</ol>")[0];
  expect(agenda.match(/<li>/g)).toHaveLength(3);
  const orderedIds = [
    "rmac-gold-coast-15k-2026",
    "hzmb-half-marathon-2026",
    "pocari-sweat-run-fest-2026",
  ];
  const positions = orderedIds.map((id) => agenda.indexOf(id));
  expect(positions.every((position) => position >= 0)).toBe(true);
  expect(positions).toEqual([...positions].sort((a, b) => a - b));
});

it("removes elapsed races and provides a useful empty state after the season", () => {
  const afterBridge = renderToStaticMarkup(
    createElement(HomeHighlights, { races, initialNow: "2026-11-16T12:00:00+08:00" }),
  );
  expect(afterBridge).not.toContain("hzmb-half-marathon-2026");
  const afterSeason = renderToStaticMarkup(
    createElement(HomeHighlights, { races, initialNow: "2028-01-01T12:00:00+08:00" }),
  );
  expect(afterSeason).toContain("新一季賽事整理中");
  expect(afterSeason).toMatch(/href="\/races\/?"/);
});
