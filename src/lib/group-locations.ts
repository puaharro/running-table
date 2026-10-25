import { distanceLabel } from "./races";
import type { Race, RaceGroup, Region } from "./types";

// Only callers' matching groups contribute locations; an unknown or different
// group region must not inherit another starting point from the event.
export function groupLocations(race: Race, groups: RaceGroup[]) {
  const locations: { venue: string | null; region: Region | null; distances: string[] }[] = [];
  for (const group of groups) {
    const region = group.region === undefined ? race.region : group.region;
    const canUseEventVenue = race.region !== null && region === race.region;
    const venue = group.venue?.trim() || (canUseEventVenue ? race.venue : null);
    let entry = locations.find(
      (location) => location.venue === venue && location.region === region,
    );
    if (!entry) {
      entry = { venue, region, distances: [] };
      locations.push(entry);
    }
    const distance = distanceLabel(group.distanceKm);
    if (!entry.distances.includes(distance)) entry.distances.push(distance);
  }
  return locations;
}
