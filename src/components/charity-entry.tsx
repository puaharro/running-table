import { language } from "@/lib/english-races";
import { englishRaceTerm } from "@/lib/race-terms.en";
import type { RaceGroup } from "@/lib/types";

export function CharityEntry({ group, english = false }: { group: RaceGroup; english?: boolean }) {
  const t = language(english);
  if (!group.charityEntry) return null;
  return (
    <article
      className="registration-channel charity-entry"
      aria-label={englishRaceTerm(group.name, english) + t(" · 慈善名額", " · Charity places")}
    >
      <h4>{t("慈善名額", "Charity places")}</h4>
      <a
        className="text-link group-official-link"
        href={group.charityEntry.officialUrl}
        target="_blank"
        rel="noopener noreferrer"
      >
        {t("詳情請參閱大會網站 ↗", "See the organiser’s website ↗")}
      </a>
    </article>
  );
}
