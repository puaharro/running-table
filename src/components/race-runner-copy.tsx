import type { RunnerCopy } from "@/lib/runner-copy";
import { language } from "@/lib/english-races";
import {
  RunnerAccountEdition,
  RunnerAccountHelp,
  RunnerAccountTopics,
} from "./runner-account-topics";

export function RaceRunnerCopy({
  copy,
  year,
  group,
  groupId,
  english = false,
  embedded = false,
}: {
  copy: RunnerCopy;
  year: string;
  group?: string;
  groupId?: string;
  english?: boolean;
  embedded?: boolean;
}) {
  const t = language(english);
  return (
    <section
      id="runner-copy"
      data-race-id={copy.raceId}
      data-edition={year}
      data-group-id={groupId ?? copy.groupId}
      data-copy-revision={copy.revision}
      data-copy-hash={copy.sha256}
      className={embedded ? "experience-compact" : "race-runner-copy experience-compact"}
      tabIndex={-1}
      aria-labelledby="runner-copy-heading"
    >
      <h2 className={embedded ? "sr-only" : undefined} id="runner-copy-heading">
        {t("跑手分享", "Runner accounts")}
      </h2>
      <RunnerAccountEdition year={Number(year)} group={group} english={english} />
      {!embedded && <RunnerAccountHelp english={english} />}
      <div className="runner-copy-body experience-topics">
        <RunnerAccountTopics sections={copy.sections} english={english} />
      </div>
    </section>
  );
}
