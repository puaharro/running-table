import { ContentStore } from "./content-management/store.mjs";
import { RegistrationReview } from "./content-management/registration-review.mjs";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";

const args = new Set(process.argv.slice(2));
if ([...args].some((arg) => !["--start", "--watch", "--force"].includes(arg))) {
  throw new Error("Usage: npm run review:registration -- [--start] [--watch] [--force]");
}
const database = fileURLToPath(
  new URL("../.editorial-private/content-management/manual.sqlite", import.meta.url),
);
const content = new ContentStore(database);
try {
  const service = new RegistrationReview(content);
  const trial = args.has("--start") ? service.start() : service.trial();
  if (!trial) throw new Error("Start the seven-day trial with --start.");
  do {
    try {
      const summary = await service.run({ force: args.delete("--force") });
      if (summary) console.log(JSON.stringify({ at: new Date().toISOString(), ...summary }));
    } catch (error) {
      if (!args.has("--watch")) throw error;
      console.error(new Date().toISOString(), error.message);
    }
    const remaining = trial.ends_at - Date.now();
    if (!args.has("--watch") || remaining <= 0) break;
    await delay(Math.min(remaining, 60 * 60 * 1000));
  } while (Date.now() < trial.ends_at);
} finally {
  content.close();
}
