import { expect,it } from "vitest";
import { races } from "../data/races";
import { guides } from "../data/guides";
import { validDate } from "./races";
it("has unique stable IDs, valid group dates and transparent prototype provenance",()=>{
  expect(new Set(races.map(r=>r.id)).size).toBe(races.length);
  expect(new Set(races.map(r=>r.slug)).size).toBe(races.length);
  const groupIds:string[]=[];
  for(const r of races){
    expect(r.sport).toBe("路跑"); expect(r.verification).toBe("demo"); expect(r.sourceUrl).toBeNull();
    expect(validDate(r.date)).toBe(true); expect(validDate(r.endDate)).toBe(true); expect(r.date<=r.endDate).toBe(true);
    expect(r.groups.length).toBeGreaterThan(0);
    for(const g of r.groups){
      groupIds.push(g.id); expect(validDate(g.date)).toBe(true); expect(g.date>=r.date && g.date<=r.endDate).toBe(true);
      expect(g.distanceKm).toBeGreaterThan(0); expect(g.price===null || g.price>=0).toBe(true);
      if(g.deadline) expect(validDate(g.deadline)).toBe(true);
    }
  }
  expect(new Set(groupIds).size).toBe(groupIds.length);
});
it("has distinct original guides with substantive content",()=>{
  expect(new Set(guides.map(g=>g.slug)).size).toBe(guides.length);
  for(const g of guides){expect(g.sections.length).toBeGreaterThanOrEqual(3);expect(g.sections.flatMap(s=>s.paragraphs).join("").length).toBeGreaterThan(300);}
});
