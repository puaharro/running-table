import catalog from "./catalog.json";
import { assertCatalog, publishedRaces } from "@/lib/catalog";

assertCatalog(catalog);
export const races = publishedRaces(catalog);
