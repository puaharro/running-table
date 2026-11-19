// Trusted owner CLI: prepare never publishes; select requires explicit approval of the exact hash.
import { readFileSync, writeFileSync, mkdirSync, renameSync } from "node:fs";
import { join } from "node:path";
import { ContentStore } from "./content-management/store.mjs";
import { ReviewStore } from "./threads/review-store.mjs";
import { prepareRuntimeRecord } from "./content-management/runtime.mjs";
import { assertConfirmedExperience } from "../src/lib/confirmed-race-experience-schema.mjs";

const [action, id, rev, approval] = process.argv.slice(2);
let c, r;
try {
  if (
    !["prepare", "select"].includes(action) ||
    !/^website-[a-f0-9-]{36}$/.test(id) ||
    !/^\d+$/.test(rev)
  )
    throw Error(
      "Usage: content:runtime prepare <website-id> <revision> | select <website-id> <revision> <owner-approved-record-hash>",
    );
  c = new ContentStore(".editorial-private/content-management/manual.sqlite");
  r = new ReviewStore(".editorial-private/research/comments/manual-reviews.sqlite");
  c.researchReviews = r;
  const { record, hash } = prepareRuntimeRecord(c, id, Number(rev));
  const b = { public_copy: record.public_copy };
  const root = ".editorial-private/runtime-prepared";
  mkdirSync(root, { recursive: true });
  const name = `${b.public_copy.race_id}-${b.public_copy.year}-${hash}.json`;
  writeFileSync(join(root, name), JSON.stringify(record, null, 2));
  if (action === "prepare") {
    console.log(
      JSON.stringify({
        file: join(root, name),
        record_hash: hash,
        publication_approved: false,
        published: false,
      }),
    );
  } else {
    if (approval !== hash)
      throw Error(
        "Exact owner-approved record hash required. Preparing or confirming CMS text does not approve public selection.",
      );
    const rated = JSON.parse(readFileSync("content/cms-runtime/selected-experiences.json", "utf8"));
    if (Object.hasOwn(rated, b.public_copy.race_id)) {
      const existing = JSON.parse(
        readFileSync(join("content/race-experiences", rated[b.public_copy.race_id].file), "utf8"),
      );
      assertConfirmedExperience(existing, b.public_copy.race_id);
      if (existing.year === b.public_copy.year)
        throw Error(
          "This edition has selected rated content; renew its complete rated selection before replacing it.",
        );
    }
    const dest = `${b.public_copy.race_id}-${b.public_copy.year}-${hash}.json`;
    writeFileSync(join("content/cms-runtime", dest), JSON.stringify(record, null, 2) + "\n");
    const path = "content/cms-runtime/selected.json";
    const index = JSON.parse(readFileSync(path, "utf8"));
    index.records[b.public_copy.race_id] = {
      file: "cms-runtime/" + dest,
      hash,
      format: "five-topic-v1",
    };
    writeFileSync(path + ".tmp", JSON.stringify(index, null, 2) + "\n");
    renameSync(path + ".tmp", path);
    console.log(
      JSON.stringify({
        selected_record_hash: hash,
        deploy: false,
        requires_commit_qa_and_deployment_approval: true,
      }),
    );
  }
} catch (e) {
  console.error(e.message);
  process.exitCode = 1;
} finally {
  c?.close();
  r?.close();
}
