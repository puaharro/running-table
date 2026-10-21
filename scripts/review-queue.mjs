import { readFileSync } from "node:fs";
const records = JSON.parse(
  readFileSync(new URL("../src/data/catalog.json", import.meta.url), "utf8"),
);
const arg = process.argv.indexOf("--as-of");
const now = arg >= 0 ? new Date(process.argv[arg + 1]) : new Date();
if (!Number.isFinite(now.getTime()))
  throw new Error("Use --as-of with a valid timestamp including timezone.");
const queue = [];
for (const race of records) {
  if (race.publication !== "published") continue;
  for (const group of race.groups) {
    const reasons = [];
    const age = group.registrationVerifiedAt
      ? now.getTime() - Date.parse(group.registrationVerifiedAt)
      : Infinity;
    const deadline = group.registrationClosesAt
      ? Date.parse(group.registrationClosesAt)
      : group.deadline
        ? Date.parse(`${group.deadline}T23:59:59+08:00`)
        : Infinity;
    if (deadline >= now.getTime() && group.status !== "closed" && age > 72 * 3600000)
      reasons.push("報名狀態超過72小時／未核實");
    if (deadline >= now.getTime() && deadline - now.getTime() <= 7 * 86400000)
      reasons.push("7日內報名截止，優先覆核");
    if (group.price === null) reasons.push("費用未核實");
    if (group.region === null || (group.region === undefined && race.region === null))
      reasons.push("組別起點地區未核實");
    if (reasons.length)
      queue.push({
        race: race.name,
        group: group.name,
        reasons,
        officialUrl: group.registrationUrl ?? race.sourceUrl,
      });
  }
}
console.log(JSON.stringify({ generatedAt: now.toISOString(), items: queue }, null, 2));
