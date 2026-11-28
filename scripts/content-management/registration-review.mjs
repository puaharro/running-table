import { randomUUID } from "node:crypto";
import { registrationSoldOutSource } from "../../src/lib/registration-sold-out.mjs";
import { ReviewError } from "../threads/review-store.mjs";
import {
  extractRegistration,
  readSource,
  sourceOverrides,
  taiPoNews,
  marathonDates,
  charityDirectory,
  checkPartnerLink,
  isLinkOnly,
  endedPartnerRegistration,
  confirmedSoldOut,
  confirmedGroupSoldOut,
} from "./registration-sources.mjs";

const hour = 3600000;
const days = 7 * 24 * hour;
export const fields = {
  registrationUrl: "報名入口",
  status: "名額狀態",
  registrationOpensAt: "開放時間",
  registrationClosesAt: "申請截止",
  price: "報名費",
  eligibility: "參賽資格、成績期及證明",
  resultAnnouncedAt: "結果公布",
  paymentClosesAt: "付款截止",
  partnerLink: "當屆官方或指定夥伴連結",
};

function normalized(field, value) {
  return [
    "registrationClosesAt",
    "registrationOpensAt",
    "resultAnnouncedAt",
    "paymentClosesAt",
  ].includes(field) &&
    value != null &&
    value.includes("T")
    ? new Date(value).toISOString()
    : value;
}

export function registrationTargets(catalog, now, recorded = []) {
  const verifiedOpen = new Map(
    recorded
      .filter(
        (row) =>
          row.field === "status" &&
          row.verifiedAt &&
          row.suggestion === "open" &&
          (row.state === "accepted" || row.oldValue === "open"),
      )
      .map((row) => [row.channelId, row.oldValue]),
  );
  const today = new Date(now + 8 * hour).toISOString().slice(0, 10);
  return catalog
    .filter((race) => race.publication === "published" && race.date >= today)
    .flatMap((race) => {
      const soldOut = confirmedSoldOut(race, now);
      return race.groups.flatMap((group) => {
        const groupSoldOut = soldOut ?? confirmedGroupSoldOut(race, group, now);
        return group.channels.flatMap((channel) => {
          const deadline = channel.registrationClosesAt ?? channel.deadline ?? null;
          const deadlineValue =
            deadline ??
            (channel.registrationDeadlineCondition === "until-full" ? "額滿即止" : null);
          const end = deadline
            ? Date.parse(deadline.includes("T") ? deadline : deadline + "T23:59:59+08:00")
            : Infinity;
          const close = channel.status === "closed" || (end < now && channel.status !== "unknown");
          const priority = ["priority", "elite"].includes(channel.type);
          const linkOnly = isLinkOnly(channel);
          if (
            linkOnly
              ? endedPartnerRegistration(race, channel, now)
              : groupSoldOut || registrationSoldOutSource(race, channel, now)
          )
            return [];
          if (
            !linkOnly &&
            !priority &&
            close &&
            channel.price != null &&
            race.id !== "garmin-run-hk-2026"
          )
            return [];
          const url = linkOnly
            ? channel.registrationUrl
            : (sourceOverrides[race.id] ?? channel.registrationUrl ?? race.sourceUrl);
          const baseline = {
            registrationUrl: channel.registrationUrl ?? null,
            status: channel.status,
            registrationOpensAt: channel.registrationOpensAt ?? channel.registrationStart ?? null,
            registrationClosesAt: deadlineValue,
            price: channel.price ?? null,
          };
          if (
            verifiedOpen.has(channel.id) &&
            (verifiedOpen.get(channel.id) === channel.status || channel.status === "open")
          )
            delete baseline.registrationOpensAt;
          if (priority) baseline.eligibility = channel.eligibility ?? null;
          for (const field of ["resultAnnouncedAt", "paymentClosesAt"]) {
            if (channel[field]) baseline[field] = channel[field];
          }
          const target = {
            race,
            group,
            channel,
            url: url ? new URL(url).href : null,
            baseline: linkOnly
              ? { partnerLink: url ?? null }
              : close && !priority
                ? { price: channel.price }
                : baseline,
            urgent:
              !linkOnly &&
              !close &&
              (end - now <= 48 * hour ||
                (Date.parse(channel.registrationOpensAt) >= now &&
                  Date.parse(channel.registrationOpensAt) - now <= 48 * hour)),
          };
          if (linkOnly) return [target];
          if (
            race.id === "run-with-love-2027" &&
            Object.hasOwn(target.baseline, "registrationClosesAt")
          ) {
            delete target.baseline.registrationClosesAt;
            return [
              target,
              { ...target, url: race.sourceUrl, baseline: { registrationClosesAt: deadline } },
            ];
          }
          if (race.id === "standard-chartered-hk-marathon-2027" && channel.type === "priority") {
            const dates = {};
            for (const field of [
              "status",
              "registrationOpensAt",
              "registrationClosesAt",
              "resultAnnouncedAt",
              "paymentClosesAt",
            ]) {
              if (Object.hasOwn(target.baseline, field)) {
                dates[field] = target.baseline[field];
                delete target.baseline[field];
              }
            }
            return [target, { ...target, url: marathonDates, baseline: dates }];
          }
          if (race.id !== "tai-po-half-2026" || group.name !== "半程馬拉松個人組") return [target];
          delete target.baseline.status;
          return [target, { ...target, url: taiPoNews, baseline: { status: channel.status } }];
        });
      });
    });
}

export class RegistrationReview {
  constructor(content) {
    this.content = content;
    this.db = content.db;
    this.db.exec(
      "CREATE TABLE IF NOT EXISTS registration_trial(id INTEGER PRIMARY KEY CHECK(id=1), starts_at INTEGER NOT NULL, ends_at INTEGER NOT NULL, lease_until INTEGER NOT NULL DEFAULT 0);" +
        "CREATE TABLE IF NOT EXISTS registration_checks(channel_id TEXT NOT NULL, field TEXT NOT NULL, payload TEXT NOT NULL, PRIMARY KEY(channel_id,field));" +
        "CREATE TABLE IF NOT EXISTS registration_runs(id TEXT PRIMARY KEY, at INTEGER NOT NULL, summary TEXT NOT NULL);" +
        "CREATE TABLE IF NOT EXISTS registration_decisions(revision TEXT PRIMARY KEY, payload TEXT NOT NULL);",
    );
  }
  trial() {
    return this.db.prepare("SELECT * FROM registration_trial WHERE id=1").get();
  }
  start(now = Date.now()) {
    this.db
      .prepare(
        "INSERT INTO registration_trial(id,starts_at,ends_at) VALUES(1,?,?) ON CONFLICT(id) DO UPDATE SET starts_at=excluded.starts_at,ends_at=excluded.ends_at WHERE ends_at <= excluded.starts_at AND lease_until <= excluded.starts_at",
      )
      .run(now, now + days);
    return this.trial();
  }
  rows() {
    return this.db
      .prepare("SELECT payload FROM registration_checks")
      .all()
      .map((item) => JSON.parse(item.payload));
  }
  runs() {
    return this.db
      .prepare("SELECT at,summary FROM registration_runs ORDER BY at DESC LIMIT 168")
      .all()
      .map(({ at, summary }) => ({ at, ...JSON.parse(summary) }));
  }
  save(row) {
    this.db
      .prepare(
        "INSERT INTO registration_checks VALUES(?,?,?) ON CONFLICT(channel_id,field) DO UPDATE SET payload=excluded.payload",
      )
      .run(row.channelId, row.field, JSON.stringify(row));
  }
  decide({ revision, decision } = {}) {
    if (typeof revision !== "string" || !["accepted", "rejected"].includes(decision))
      throw new ReviewError(400, "請選擇有效的覆核決定。");
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const row = this.rows().find((item) => item.revision === revision);
      const target =
        row &&
        registrationTargets(this.content.baseCatalog, Date.now(), this.rows()).find(
          (item) => item.channel.id === row.channelId && Object.hasOwn(item.baseline, row.field),
        );
      if (
        !row ||
        row.state !== "change" ||
        !target ||
        target.baseline[row.field] !== row.oldValue ||
        target.url !== row.url
      )
        throw new ReviewError(409, "建議或原有資料已變，請重新載入。");
      const updated = { ...row, state: decision, decision, decidedAt: Date.now() };
      this.save(updated);
      this.db
        .prepare("INSERT INTO registration_decisions VALUES(?,?)")
        .run(revision, JSON.stringify(updated));
      this.db.exec("COMMIT");
      return updated;
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }
  async run({ now = Date.now(), load = readSource, force = false } = {}) {
    const lease = now + 10 * 60 * 1000;
    if (
      !this.db
        .prepare(
          "UPDATE registration_trial SET lease_until=? WHERE id=1 AND starts_at<=? AND ends_at>? AND lease_until<=?",
        )
        .run(lease, now, now, now).changes
    )
      return null;
    try {
      const previous = new Map(this.rows().map((row) => [row.channelId + ":" + row.field, row]));
      const byUrl = new Map();
      for (const target of registrationTargets(this.content.baseCatalog, now, [
        ...previous.values(),
      ])) {
        if (!byUrl.has(target.url)) byUrl.set(target.url, []);
        byUrl.get(target.url).push(target);
      }
      const due = [...byUrl].filter(
        ([, targets]) =>
          force ||
          targets.some((target) =>
            Object.keys(target.baseline).some((field) => {
              const last = previous.get(target.channel.id + ":" + field);
              const hours =
                field === "partnerLink" && last?.state === "same"
                  ? 168
                  : target.urgent
                    ? 6
                    : last?.misses >= 2
                      ? 48
                      : 24;
              return (
                !last ||
                last.attemptedAt < this.trial().starts_at ||
                last.oldValue !== target.baseline[field] ||
                last.url !== target.url ||
                now - last.attemptedAt >= hours * hour
              );
            }),
          ),
      );
      const needsDirectory = due.some(([, targets]) =>
        targets.some(
          (t) =>
            t.race.id === "standard-chartered-hk-marathon-2027" && t.channel.type === "charity",
        ),
      );
      const counts = {
        sources: new Set([
          ...due.map(([url]) => url).filter(Boolean),
          ...(needsDirectory ? [charityDirectory] : []),
        ]).size,
        readable: 0,
        same: 0,
        change: 0,
        pending: 0,
        accepted: 0,
        rejected: 0,
      };
      const observations = [];
      if (due.some(([, targets]) => targets.some((t) => isLinkOnly(t.channel))))
        Object.assign(counts, { linksSame: 0, linksPending: 0 });
      const linkResults = { linksSame: new Set(), linksPending: new Set() };
      let directory = "";
      if (needsDirectory) {
        try {
          directory = await load(new URL(charityDirectory));
          counts.readable++;
        } catch {
          // Partner confirmations require the organizer's current directory.
        }
      }
      for (let index = 0; index < due.length; index += 4) {
        await Promise.all(
          due.slice(index, index + 4).map(async ([url, targets]) => {
            let page = "",
              reason;
            try {
              if (!url) throw new Error("未有當屆詳情連結");
              if (url === charityDirectory && needsDirectory) {
                if (!directory) throw new Error("未能讀取大會慈善機構名單");
                page = directory;
              } else {
                page = await load(new URL(url));
                counts.readable++;
              }
            } catch (error) {
              reason = error.message;
            }
            for (const { race, group, channel, baseline, urgent } of targets) {
              const values = isLinkOnly(channel)
                ? { partnerLink: checkPartnerLink(race, channel, page, directory) }
                : extractRegistration(race, group, channel, page, url, now);
              for (const [field, oldValue] of Object.entries(baseline))
                observations.push({
                  raceId: race.id,
                  year: Number(race.date.slice(0, 4)),
                  group: group.name,
                  channel: channel.name,
                  channelId: channel.id,
                  field,
                  url,
                  oldValue,
                  urgent,
                  value: values[field],
                  reason:
                    reason ??
                    (isLinkOnly(channel)
                      ? "未能確認連結適用當屆，或未能核對大會指定關係"
                      : "未讀到足以對應當屆、組別及欄位的明確官方原文"),
                });
            }
          }),
        );
      }
      if (!due.length) return null;
      this.db.exec("BEGIN IMMEDIATE");
      try {
        // Re-read under the write lock so a decision made during a fetch is preserved.
        const current = new Map(this.rows().map((row) => [row.channelId + ":" + row.field, row]));
        for (const { value, reason, ...item } of observations) {
          const last = current.get(item.channelId + ":" + item.field);
          const same =
            value &&
            ((item.field === "registrationClosesAt" &&
              value.value === "額滿即止" &&
              item.oldValue == null) ||
              normalized(item.field, value.value) === normalized(item.field, item.oldValue));
          const prior = last?.url === item.url && last?.oldValue === item.oldValue ? last : null;
          const retained =
            value &&
            prior?.suggestion === value.value &&
            ["accepted", "rejected"].includes(prior.decision);
          const state = value ? (same ? "same" : retained ? prior.decision : "change") : "pending";
          const row = {
            ...item,
            state,
            attemptedAt: now,
            misses: value ? 0 : (prior?.misses ?? 0) + 1,
            verifiedAt: value ? now : (prior?.verifiedAt ?? null),
            evidence: value?.quote ?? prior?.evidence ?? null,
            suggestion: value?.value ?? prior?.suggestion ?? null,
            revision: retained ? prior.revision : randomUUID(),
            decision: retained || !value ? prior?.decision : null,
            decidedAt: retained || !value ? prior?.decidedAt : null,
            reason: value ? "" : reason,
          };
          this.save(row);
          if (item.field === "partnerLink") {
            const counter = state === "same" ? "linksSame" : "linksPending";
            linkResults[counter].add(item.raceId + ":" + (item.url ?? item.channelId));
            counts[counter] = linkResults[counter].size;
          } else counts[state]++;
        }
        this.db
          .prepare("INSERT INTO registration_runs VALUES(?,?,?)")
          .run(randomUUID(), now, JSON.stringify(counts));
        this.db.exec("COMMIT");
      } catch (error) {
        this.db.exec("ROLLBACK");
        throw error;
      }
      return counts;
    } finally {
      this.db
        .prepare("UPDATE registration_trial SET lease_until=0 WHERE id=1 AND lease_until=?")
        .run(lease);
    }
  }
}
