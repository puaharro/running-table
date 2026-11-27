import { confirmedHandoff } from "./handoff.mjs";
import { publicHash, validatePublicCopy } from "../../src/lib/cms-runtime-schema.mjs";
export function prepareRuntimeRecord(content, id, revision, groupId) {
  const b = confirmedHandoff(content, id, revision);
  validatePublicCopy(b.public_copy);
  const race = content.catalog.find((v) => v.id === b.public_copy.race_id && !v.private);
  if (!race) throw Error("Race must already exist in public catalog");
  if (Number(race.date?.slice(0, 4)) !== b.public_copy.year)
    throw Error("CMS copy year must match the public race edition");
  const group =
    race.groups.find((entry) => entry.id === groupId) ??
    (!groupId && race.groups.length === 1 ? race.groups[0] : undefined);
  if (!group) throw Error("Choose a group from the selected race edition");
  const record = {
    group_id: group.id,
    manifest: {
      source_website_id: id,
      source_revision: revision,
      source_content_hash: b.manifest.source_content_hash,
      public_content_hash: b.manifest.public_content_hash,
    },
    public_copy: b.public_copy,
  };
  return { record, hash: publicHash(record) };
}

export function compareRuntimeCopy(candidate, current) {
  const fields = ["body", "limitations", "urls"];
  return candidate.sections.flatMap((section) => {
    const previous = current?.sections.find((entry) => entry.topic === section.topic);
    const changes = fields.flatMap((key) =>
      JSON.stringify(previous?.[key]) === JSON.stringify(section[key])
        ? []
        : [{ key, before: previous?.[key] ?? null, after: section[key] }],
    );
    return changes.length ? [{ topic: section.topic, changes }] : [];
  });
}
