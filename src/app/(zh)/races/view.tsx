import "./calendar.css";
import { RaceExplorer } from "@/components/race-explorer";
import { publicRaces as races } from "@/data/races";
import { editorialReviews } from "@/data/editorial-reviews";

export function RaceSearchView({ english = false }: { english?: boolean }) {
  return (
    <main id="main" className="search-page">
      <RaceExplorer
        english={english}
        races={races}
        reviews={editorialReviews}
        initialNow={new Date().toISOString()}
      />
    </main>
  );
}
