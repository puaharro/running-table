import type { RaceGroup } from "@/lib/types";

export function CharityEntry({ group }: { group: RaceGroup }) {
  if (!group.charityEntry) return null;
  return (
    <article className="registration-channel charity-entry" aria-label={group.name + " · 慈善名額"}>
      <h4>慈善名額</h4>
      <a
        className="text-link group-official-link"
        href={group.charityEntry.officialUrl}
        target="_blank"
        rel="noopener noreferrer"
      >
        詳情請參閱大會網站 ↗
      </a>
    </article>
  );
}
