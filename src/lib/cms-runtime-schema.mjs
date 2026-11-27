import { createHash } from "node:crypto";
export const publicHash = (value) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");
export const runnerAccountTopics = ["賽道", "補給", "寄存", "交通", "大會安排"];
export function validatePublicCopy(copy) {
  if (
    !copy ||
    Object.keys(copy).sort().join() !== "race_id,sections,title,year" ||
    typeof copy.race_id !== "string" ||
    !/^[a-z0-9-]+$/.test(copy.race_id) ||
    !Number.isInteger(copy.year) ||
    copy.year < 1900 ||
    copy.year > 2200 ||
    typeof copy.title !== "string" ||
    !copy.title.trim() ||
    /候選|待覆核|待確認|未部署/.test(copy.title) ||
    !Array.isArray(copy.sections) ||
    copy.sections.length !== 5
  )
    throw Error("Invalid confirmed public copy");
  copy.sections.forEach((s, i) => {
    if (
      Object.keys(s).sort().join() !== "body,limitations,topic,urls" ||
      s.topic !== runnerAccountTopics[i] ||
      typeof s.body !== "string" ||
      !s.body.trim() ||
      typeof s.limitations !== "string" ||
      !s.limitations.trim() ||
      !Array.isArray(s.urls)
    )
      throw Error("Invalid public section");
    for (const link of s.urls) {
      const u = new URL(link);
      if (u.protocol !== "https:" || u.username || u.password) throw Error("Unsafe citation");
    }
  });
  return copy;
}

// The legacy selection is hash-verified before adapting its original Markdown for display.
function legacyRunnerSections(markdown) {
  const [, ...blocks] = markdown.trim().split(/\r?\n\r?\n+/);
  if (blocks.length !== runnerAccountTopics.length * 4)
    throw Error("Invalid legacy runner account layout");
  return runnerAccountTopics.map((topic, index) => {
    const [heading, body, note, sources] = blocks.slice(index * 4, index * 4 + 4);
    const prefix = "**觀察限制：** ";
    const missingSources = "來源：未知／未有足夠材料";
    const citations = sources
      .split(" · ")
      .map((source) => /^\[(來源\d+)\]\((https:\/\/[^)\s]+)\)$/.exec(source));
    if (
      heading !== "## " + topic ||
      !note.startsWith(prefix) ||
      (sources !== missingSources && citations.some((citation) => !citation))
    )
      throw Error("Invalid legacy runner account topic");
    return {
      topic,
      body,
      limitations: note.slice(prefix.length),
      urls: sources === missingSources ? [] : citations.map((citation) => citation[2]),
      ...(sources === missingSources
        ? { missingSources }
        : { sourceLabels: citations.map((citation) => citation[1]) }),
    };
  });
}
export function runtimeMarkdown(copy) {
  validatePublicCopy(copy);
  return (
    "# " +
    copy.title +
    "\n\n" +
    copy.sections
      .map(
        (s) =>
          "## " +
          s.topic +
          "\n\n" +
          s.body +
          "\n\n**觀察限制：** " +
          s.limitations +
          "\n\n" +
          (s.urls.map((u, i) => `[來源${i + 1}](${u})`).join(" · ") || "來源：未知／未有足夠材料"),
      )
      .join("\n\n")
  );
}
export function validateRuntimeRecord(record, pin, raceId, editionYear) {
  if (publicHash(record) !== pin.hash || (record.raceId ?? record.public_copy?.race_id) !== raceId)
    throw Error("Copy does not match the selected confirmed revision.");
  if (pin.format === "markdown") {
    if (
      typeof record.markdown !== "string" ||
      createHash("sha256").update(record.markdown).digest("hex") !== record.sha256
    )
      throw Error("Invalid selected confirmed revision");
    return { ...record, sections: legacyRunnerSections(record.markdown) };
  }
  if (
    pin.format !== "five-topic-v1" ||
    record.public_copy?.year !== editionYear ||
    Object.keys(record.manifest ?? {})
      .sort()
      .join() !== "public_content_hash,source_content_hash,source_revision,source_website_id" ||
    !["manifest,public_copy", "group_id,manifest,public_copy"].includes(
      Object.keys(record).sort().join(),
    ) ||
    (Object.hasOwn(record, "group_id") &&
      (!/^[a-z0-9-]+$/.test(record.group_id ?? "") || record.group_id !== pin.groupId)) ||
    record.manifest.public_content_hash !== publicHash(record.public_copy) ||
    !Number.isInteger(record.manifest.source_revision) ||
    record.manifest.source_revision < 1 ||
    !/^website-[a-f0-9-]{36}$/.test(record.manifest.source_website_id) ||
    !/^[a-f0-9]{64}$/.test(record.manifest.source_content_hash)
  )
    throw Error("Invalid confirmed runtime record");
  const markdown = runtimeMarkdown(record.public_copy);
  return {
    revision: record.manifest.source_revision,
    groupId: pin.groupId,
    raceId,
    sourceWebsiteId: record.manifest.source_website_id,
    sourceContentHash: record.manifest.source_content_hash,
    markdown,
    sections: record.public_copy.sections,
    sha256: createHash("sha256").update(markdown).digest("hex"),
  };
}
