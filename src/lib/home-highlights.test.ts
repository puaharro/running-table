import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { HomeView } from "@/app/(zh)/home-view";
import { HomeHighlights } from "@/components/home-highlights";
import { publicRaces as races } from "@/data/races";
import { homeRaceNews } from "@/lib/home-race-news";

const initialNow = "2026-11-16T12:00:00+08:00";

it("places the localised calendar link before the banner and links deadlines to registration details", () => {
  for (const english of [false, true]) {
    const home = renderToStaticMarkup(createElement(HomeView, { english }));
    const intro = home.split('class="shell home-intro"')[1].split("</header>")[0];
    expect(intro).not.toContain('role="search"');
    expect(intro.match(/<a\b/g)).toHaveLength(1);
    expect(intro).toMatch(english ? /href="\/en\/races\/?"/ : /href="\/races\/?"/);
    expect(home).toContain("home-focus-banner");
    expect(home.indexOf("home-intro-links")).toBeLessThan(home.indexOf("home-focus-banner"));
  }

  const html = renderToStaticMarkup(createElement(HomeHighlights, { races, initialNow }));
  expect(html).toContain("最新消息");
  const news = html.split('class="home-news-sheet"')[1].split("<aside")[0];
  expect(news).toMatch(/sai-kung-district-run-2026\/?#registration-groups/);
  expect(news).toContain("距報名截止尚餘 2 日");
  expect(news.indexOf("sai-kung-district-run-2026")).toBeLessThan(
    news.indexOf("ocean-park-run-for-survival-2026"),
  );

  const english = renderToStaticMarkup(
    createElement(HomeHighlights, { races, initialNow, english: true }),
  );
  expect(english).toContain("Latest news");
  expect(english).toMatch(/sai-kung-district-run-2026\/?#registration-groups/);
  expect(english).toContain("/en/races/2026/sai-kung-district-run-2026");
  expect(english).toContain("entries close in 2 days");
});

it("uses Hong Kong midnight for date-only deadlines and drops timed entries at cutoff", () => {
  const id = "sai-kung-district-run-2026-deadline";
  const itemsAt = (now: string) => homeRaceNews(races, now);
  expect(itemsAt("2026-11-18T15:59:00Z").find((item) => item.id === id)?.headline).toContain(
    "今日截止",
  );
  expect(itemsAt("2026-11-18T16:00:00Z").map((item) => item.id)).not.toContain(id);
  expect(
    itemsAt("2026-11-27T23:58:00+08:00").some((item) => item.id === "schkm-youth-2027-deadline"),
  ).toBe(true);
  expect(
    itemsAt("2026-11-27T23:59:00+08:00").some((item) => item.id === "schkm-youth-2027-deadline"),
  ).toBe(false);
});

it("shows an explicitly verified course map and removes expired news", () => {
  const race = structuredClone(races.find((item) => item.id === "schkm-youth-2027")!);
  race.sources!.push({
    id: "test-course-map",
    title: "Test organiser course map",
    url: "https://example.com/test-map",
    checkedAt: initialNow,
    fields: ["courseMap"],
  });
  expect(
    homeRaceNews([race], "2026-11-16T11:59:00+08:00").some((item) =>
      item.href.includes("test-course-map"),
    ),
  ).toBe(false);
  expect(
    homeRaceNews([race], initialNow, true).find((item) => item.category === "Course map"),
  ).toMatchObject({
    category: "Course map",
    href: "/en/races/2027/schkm-youth-2027/#source-test-course-map",
  });
  expect(homeRaceNews([race], "2026-12-17T12:00:00+08:00")).toEqual([]);

  const afterSeason = renderToStaticMarkup(
    createElement(HomeHighlights, { races, initialNow: "2028-01-01T12:00:00+08:00" }),
  );
  expect(afterSeason).toContain("暫無已核實的最新消息");
  expect(afterSeason).toMatch(/href="\/races\/?"/);
});
