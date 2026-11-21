import { confirmedHandoff } from "./handoff.mjs";
import { publicHash, validatePublicCopy } from "../../src/lib/cms-runtime-schema.mjs";
export function prepareRuntimeRecord(content, id, revision) {
  const b = confirmedHandoff(content, id, revision);
  validatePublicCopy(b.public_copy);
  const race = content.catalog.find((v) => v.id === b.public_copy.race_id && !v.private);
  if (!race) throw Error("Race must already exist in public catalog");
  if (Number(race.date?.slice(0, 4)) !== b.public_copy.year)
    throw Error("CMS copy year must match the public race edition");
  const record = {
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
