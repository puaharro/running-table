import {
  evidenceLabels,
  ratingDimensions,
  ratingPolicy,
  reviewTargets,
  segmentLabels,
  type RatingDimension,
} from "./rating-policy";
import type { Race, RaceGroup } from "./types";
import { isHttpsUrl, validTimestamp } from "./catalog";
import { validDate } from "./races";

export type ExperienceScore = 1 | 2 | 3 | 4 | 5;
export interface ExperienceAssessment {
  score: ExperienceScore | null;
  comment: string;
  positives: string[];
  concerns: string[];
  suitedFor: string;
  evidenceIds: string[];
}
export interface EditorialReview {
  id: string;
  status: "published";
  revision: number;
  approval: {
    by: string;
    at: string;
    reference: string;
    revision: number;
    contentHash: string;
    confirmed: { scores: true; wording: true; evidence: true; scope: true };
    riskReview?: { by: string; reference: string; note: string };
  };
  targetId: string;
  editionYear: number;
  eventDate: string;
  reviewer: string;
  reviewedAt: string;
  ruleVersion: string;
  runnerSegment: keyof typeof segmentLabels;
  disclosure: string;
  observationLimits: string;
  courseNotes: string;
  evidence: {
    id: string;
    kind: keyof typeof evidenceLabels;
    description: string;
    editionYear: number;
    runnerSegment?: keyof typeof segmentLabels;
    url?: string;
  }[];
  quickTake?: { summary: string; reminders: [string, string] };
  assessments: Record<RatingDimension, ExperienceAssessment>;
  changes?: { revision: number; at: string; summary: string }[];
  organizerResponses?: {
    id: string;
    organization: string;
    receivedAt: string;
    text: string;
    reference: string;
  }[];
}
const text = (v: unknown): v is string => typeof v === "string" && !!v.trim();
const strings = (v: unknown): v is string[] => Array.isArray(v) && v.every(text);
const object = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);

// Published content only. Browser drafts are a separate format and must be reviewed first.
export function assertEditorialReviews(
  input: unknown,
  now = new Date().toISOString(),
): asserts input is EditorialReview[] {
  const fail = (reason: string): never => {
    throw new Error(`Editorial review: ${reason}`);
  };
  if (!Array.isArray(input)) fail("expected array");
  const ids = new Set<string>(),
    editions = new Set<string>();
  for (const item of input as unknown[]) {
    if (!object(item)) fail("expected object");
    const r = item as unknown as EditorialReview;
    if (!text(r.id) || ids.has(r.id)) fail("missing or duplicate id");
    ids.add(r.id);
    if (r.status !== "published") fail("drafts cannot enter published data");
    if (!reviewTargets.some((t) => t.id === r.targetId)) fail("unknown target");
    if (
      !Number.isInteger(r.editionYear) ||
      r.editionYear < 2000 ||
      !validDate(r.eventDate) ||
      Number(r.eventDate.slice(0, 4)) !== r.editionYear
    )
      fail("edition/date mismatch");
    if (
      !validTimestamp(r.reviewedAt) ||
      Date.parse(r.reviewedAt) > Date.parse(now) ||
      r.eventDate > r.reviewedAt.slice(0, 10)
    )
      fail("review must follow event and cannot be in future");
    const key = `${r.targetId}:${r.editionYear}`;
    if (editions.has(key))
      fail("duplicate edition; update its editorial review instead of averaging");
    editions.add(key);
    if (r.ruleVersion !== ratingPolicy.version) fail("unsupported rule version");
    for (const value of [r.reviewer, r.disclosure, r.observationLimits])
      if (!text(value)) fail("reviewer, disclosure and limits required");
    if (!Object.hasOwn(segmentLabels, r.runnerSegment) || typeof r.courseNotes !== "string")
      fail("invalid observation scope");
    if (
      r.quickTake !== undefined &&
      (!object(r.quickTake) ||
        !text(r.quickTake.summary) ||
        r.quickTake.summary.length > 100 ||
        !strings(r.quickTake.reminders) ||
        r.quickTake.reminders.length !== 2 ||
        r.quickTake.reminders.some((v) => v.length > 70))
    )
      fail("quick take needs a short summary and two reminders");
    if (!Array.isArray(r.evidence)) fail("evidence required");
    const evidenceIds = new Set<string>();
    for (const e of r.evidence) {
      if (
        !object(e) ||
        !text(e.id) ||
        evidenceIds.has(e.id) ||
        !Object.hasOwn(evidenceLabels, e.kind) ||
        !text(e.description) ||
        e.editionYear !== r.editionYear ||
        (e.url !== undefined && !isHttpsUrl(e.url)) ||
        (e.runnerSegment !== undefined && !Object.hasOwn(segmentLabels, e.runnerSegment))
      )
        fail("invalid, duplicate or wrong-edition evidence");
      evidenceIds.add(e.id);
    }
    if (
      !object(r.assessments) ||
      Object.keys(r.assessments).some((k) => !ratingDimensions.includes(k as RatingDimension))
    )
      fail("invalid dimensions");
    for (const dimension of ratingDimensions) {
      const a = r.assessments[dimension];
      if (
        !object(a) ||
        !text(a.comment) ||
        !strings(a.positives) ||
        !strings(a.concerns) ||
        typeof a.suitedFor !== "string" ||
        !strings(a.evidenceIds) ||
        a.evidenceIds.some((id) => !evidenceIds.has(id))
      )
        fail("invalid assessment or missing evidence link");
      if (a.score !== null) {
        if (
          !Number.isInteger(a.score) ||
          a.score < 1 ||
          a.score > 5 ||
          !text(a.suitedFor) ||
          !(a.positives.length + a.concerns.length)
        )
          fail("score needs 1–5, audience and concrete observations");
        if (
          !r.evidence.some(
            (e) =>
              a.evidenceIds.includes(e.id) &&
              (e.kind === "participation" || e.kind === "interview"),
          )
        )
          fail("experience score requires participation or interview evidence");
        if (
          dimension === "aid" &&
          a.score === 5 &&
          !r.evidence.some(
            (e) =>
              a.evidenceIds.includes(e.id) &&
              (e.kind === "participation" || e.kind === "interview") &&
              (e.runnerSegment === "back" ||
                (e.kind === "participation" && r.runnerSegment === "back")),
          )
        )
          fail("top aid score requires back-of-field observations");
      }
    }
    if (
      r.changes !== undefined &&
      (!Array.isArray(r.changes) ||
        r.changes.some(
          (change) =>
            !object(change) ||
            !Number.isInteger(change.revision) ||
            change.revision < 1 ||
            change.revision > r.revision ||
            !validTimestamp(change.at) ||
            Date.parse(change.at) > Date.parse(r.reviewedAt) ||
            !text(change.summary),
        ))
    )
      fail("invalid public change history");
    if (
      r.organizerResponses !== undefined &&
      (!Array.isArray(r.organizerResponses) ||
        new Set(r.organizerResponses.map((reply) => reply?.id)).size !==
          r.organizerResponses.length ||
        r.organizerResponses.some(
          (reply) =>
            !object(reply) ||
            !text(reply.id) ||
            !text(reply.organization) ||
            !validTimestamp(reply.receivedAt) ||
            Date.parse(reply.receivedAt) > Date.parse(r.reviewedAt) ||
            !text(reply.text) ||
            !text(reply.reference),
        ))
    )
      fail("invalid organizer response");
    const a = r.approval;
    if (
      !Number.isInteger(r.revision) ||
      r.revision < 1 ||
      !a ||
      !text(a.by) ||
      !text(a.reference) ||
      !validTimestamp(a.at) ||
      Date.parse(a.at) > Date.parse(now) ||
      Date.parse(a.at) < Date.parse(r.reviewedAt) ||
      a.revision !== r.revision ||
      !/^[a-f0-9]{64}$/.test(a.contentHash) ||
      !a.confirmed ||
      ![a.confirmed.scores, a.confirmed.wording, a.confirmed.evidence, a.confirmed.scope].every(
        (v) => v === true,
      )
    )
      fail("human confirmation of current revision required");
  }
}
export function reviewsForGroup(race: Race, group: RaceGroup, reviews: EditorialReview[]) {
  const target = reviewTargets.find((t) => t.raceId === race.id && t.groupId === group.id);
  if (!target) return { current: [], historical: [] };
  const year = Number(group.date.slice(0, 4));
  const matches = reviews.filter((r) => r.status === "published" && r.targetId === target.id);
  return {
    current: matches.filter((r) => r.editionYear === year),
    historical: matches
      .filter((r) => r.editionYear < year)
      .sort((a, b) => b.editionYear - a.editionYear),
  };
}
