import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { RunnerAccountsCatalog } from "@/components/ratings-catalog";
import { publicRaces } from "@/data/races";
import { raceHref } from "./site";

const selected = (id: string) => publicRaces.find((race) => race.id === id)!;

it("includes CMS and editorial accounts in the same group, with one link per year", () => {
  const hzmb = selected("hzmb-half-marathon-2026");
  const schkm = selected("standard-chartered-hk-marathon-2027");
  const rmac = selected("rmac-gold-coast-15k-2026");
  const html = renderToStaticMarkup(
    createElement(RunnerAccountsCatalog, { races: [hzmb, schkm, rmac] }),
  );
  const [published, empty] = html.split('<details class="ratings-coverage"');
  for (const [race, latest] of [
    [hzmb, "runner-copy"],
    [schkm, "review-schkm-marathon-2026-participant-notes"],
  ] as const) {
    const pastHref = raceHref(race) + "#race-confirmed-experience";
    const latestHref = raceHref(race) + "#" + latest;
    expect(published.split(pastHref)).toHaveLength(2);
    expect(published.split(latestHref)).toHaveLength(2);
    expect(published.indexOf(latestHref)).toBeLessThan(published.indexOf(pastHref));
  }
  expect(published).toContain("index-hzmb-half-2025-participant-notes");
  expect(published).toContain("index-schkm-marathon-2026-participant-notes");
  expect(published).toContain(raceHref(rmac) + "#runner-copy");
  expect(published).not.toContain("十公里");
  expect(empty).toContain('id="edition-coverage"');
  expect(empty).toContain(raceHref(hzmb) + "#ratings-hzmb-2026-10k");
});

it("links to the localized race page from the English directory", () => {
  const race = selected("hzmb-half-marathon-2026");
  const html = renderToStaticMarkup(
    createElement(RunnerAccountsCatalog, { races: [race], english: true }),
  );
  expect(html).toContain("/en" + raceHref(race) + "#runner-copy");
  expect(html).toContain("/en" + raceHref(race) + "#race-confirmed-experience");
});
