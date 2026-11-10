import { simplifyCharityEntry } from "@/lib/charity-entry";
import catalog from "./catalog.json";
import { assertCatalog, publishedRaces } from "@/lib/catalog";

assertCatalog(catalog);
export const races = publishedRaces(catalog);

export const publicRaces = races.map(simplifyCharityEntry);
