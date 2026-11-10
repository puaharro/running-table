import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { publicRaces, races } from "@/data/races";
import { CharityEntry } from "@/components/charity-entry";
import { RegistrationGroups, RegistrationSummary } from "@/components/live-registration";
import { defaultFilters, selectRaces } from "./races";
import { listRegistration } from "./list-registration";

const now = "2026-10-27T01:00:00+08:00";
const main = publicRaces.find((race) => race.id === "standard-chartered-hk-marathon-2027")!;
const unicef = publicRaces.find((race) => race.id === "unicef-powerun-2027")!;
describe("public charity entry referral", () => {
  it("shows availability and the organiser URL without individual recruitment details", () => {
    const html = renderToStaticMarkup(createElement(CharityEntry, { group: main.groups[0] }));
    expect(html).toContain("慈善名額");
    expect(html).not.toContain("慈善名額：");
    expect(html).toContain('href="https://www.hkmarathon.com/marathon-charity-programme"');
    const content = JSON.stringify(main);
    for (const text of ["婦女動力基金", "最低捐款", "charity-herfund", "慈善報名（"])
      expect(content).not.toContain(text);
    for (const Component of [RegistrationGroups, RegistrationSummary]) {
      const registration = renderToStaticMarkup(
        createElement(Component, { race: main, initialNow: now }),
      );
      expect(registration).not.toContain("最低籌款額");
      expect(registration).not.toContain("charity-herfund");
      expect(registration).toContain("住宿");
      expect(registration.match(/class="registration-channel charity-entry"/g)).toHaveLength(3);
      expect(registration).toContain("詳情請參閱大會網站");
    }
    // Existing source research is retained, without being sent to public pages.
    expect(
      races
        .find((race) => race.id === main.id)!
        .groups[0].channels.some((c) => c.type === "charity"),
    ).toBe(true);
  });
  it("keeps charity-only races and their distances in the list without prices or status claims", () => {
    const result = selectRaces(publicRaces, { ...defaultFilters, channels: ["charity"] }, now);
    expect(result.map(({ race }) => race.id).sort()).toEqual([main.id, unicef.id].sort());
    expect(result.find(({ race }) => race.id === unicef.id)!.groups).toHaveLength(4);
    expect(unicef.groups.every((group) => group.channels.length === 0)).toBe(true);
    expect(listRegistration(unicef, unicef.groups, now)).toBe("報名詳情請參閱大會網站");
    expect(JSON.stringify(unicef)).not.toContain("最低籌款額");
    expect(
      selectRaces([unicef], { ...defaultFilters, channels: ["charity"], statuses: ["open"] }, now),
    ).toEqual([]);
  });
  it("only shows the charity referral for groups with known charity channels", () => {
    const race = publicRaces.find((race) => !race.charityEntry)!;
    expect(renderToStaticMarkup(createElement(CharityEntry, { group: race.groups[0] }))).toBe("");
    const html = renderToStaticMarkup(
      createElement(RegistrationGroups, { race: main, initialNow: now }),
    );
    expect(html).toContain('id="channel-schkm-2027-marathon-charity"');
    expect(html).not.toContain("慈善名額：有");
    expect(html).not.toContain("慈善名額：無");
    expect(html).not.toContain("慈善名額：未列明");
  });
});
