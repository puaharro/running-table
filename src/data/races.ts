import { simplifyCharityEntry } from "@/lib/charity-entry";
import catalog from "./catalog.json";
import { assertCatalog, publishedRaces } from "@/lib/catalog";
import { layoutStressRaces } from "./layout-stress-fixture";

assertCatalog(catalog);
const published = publishedRaces(catalog);
export const races =
  process.env.NODE_ENV === "development" && process.env.NXTGO_LAYOUT_STRESS === "1"
    ? layoutStressRaces(published)
    : published;

export const publicRaces = races.map(simplifyCharityEntry);
