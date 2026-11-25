import { englishRaceTerm } from "@/lib/race-terms.en";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { englishGuides } from "@/data/guides.en";
import { publicRaces } from "@/data/races";
import { raceHref } from "@/lib/site";
import { releaseSettings } from "@/lib/release";
import { HomeView } from "@/app/(zh)/home-view";
import { RaceSearchView } from "@/app/(zh)/races/view";
import RaceView from "@/app/(zh)/races/[year]/[slug]/view";
import GuideView from "@/app/(zh)/guides/[slug]/view";
import GuidesView from "@/app/(zh)/guides/view";
import RatingsView from "@/app/(zh)/ratings/view";
import ProcessView from "@/app/(zh)/ratings/process/view";
import FeedbackView from "@/app/(zh)/ratings/feedback/view";
import NotebookView from "@/app/(zh)/ratings/notebook/view";
import AboutView from "@/app/(zh)/about/view";
import PrivacyView from "@/app/(zh)/privacy/view";

const titles: Record<string, string> = {
  "": "Hong Kong road races",
  races: "Hong Kong race calendar",
  ratings: "Runner accounts",
  "ratings/process": "How reviews are assessed",
  "ratings/feedback": "Editorial feedback",
  "ratings/notebook": "Race notebook",
  guides: "Race selection and registration guides",
  about: "About NXTGO",
  privacy: "Privacy notice",
};
const descriptions: Record<string, string> = {
  "": "Find Hong Kong road races, official entry information, runner experiences and guides to choosing your next race.",
  races:
    "Browse Hong Kong road races by date, distance, region and entry status. Compare categories and see official deadlines.",
  ratings: "Browse published Hong Kong race accounts by race, category and edition.",
  "ratings/process":
    "Learn how NXTGO checks race reviews, records corrections and handles organiser responses.",
  "ratings/feedback":
    "Prepare private email feedback about an NXTGO race review or send an organiser response.",
  "ratings/notebook":
    "Record your race experience and keep drafts in your browser, with export and import for backups.",
  guides:
    "Practical Hong Kong road running guides for choosing a race, checking entry details and preparing for race day.",
  about:
    "How NXTGO verifies official Hong Kong race information, publishes runner reviews and handles corrections.",
  privacy: "How the NXTGO beta handles saved races, search filters, race notes and feedback.",
};
const raceByPath = new Map(publicRaces.map((race) => [raceHref(race).slice(1, -1), race]));
const guideByPath = new Map(englishGuides.map((guide) => [`guides/${guide.slug}`, guide]));
type Props = { params: Promise<{ path?: string[] }> };

export const dynamicParams = false;
export function generateStaticParams() {
  return [...Object.keys(titles), ...raceByPath.keys(), ...guideByPath.keys()].map((route) => ({
    path: route ? route.split("/") : [],
  }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const route = (await params).path?.join("/") ?? "";
  const race = raceByPath.get(route);
  const title = race?.englishName ?? guideByPath.get(route)?.title ?? titles[route];
  if (!title) return {};
  const chinese = route ? `/${route}/` : "/";
  const english = `/en${chinese}`;
  return {
    title,
    description: race
      ? englishRaceTerm(race.summary, true)
      : (guideByPath.get(route)?.description ?? descriptions[route]),
    ...(["ratings/feedback", "ratings/notebook"].includes(route)
      ? { robots: { index: false, follow: false } }
      : {}),
    ...(releaseSettings.origin
      ? { alternates: { canonical: english, languages: { en: english, "zh-HK": chinese } } }
      : {}),
  };
}

const pages = {
  "": HomeView,
  races: RaceSearchView,
  guides: GuidesView,
  ratings: RatingsView,
  "ratings/process": ProcessView,
  "ratings/feedback": FeedbackView,
  "ratings/notebook": NotebookView,
  about: AboutView,
  privacy: PrivacyView,
};

export default async function EnglishPage({ params }: Props) {
  const path = (await params).path ?? [];
  const route = path.join("/");
  if (raceByPath.has(route))
    return <RaceView english params={Promise.resolve({ year: path[1], slug: path[2] })} />;
  if (guideByPath.has(route))
    return <GuideView english params={Promise.resolve({ slug: path[1] })} />;
  const Page = Object.hasOwn(pages, route) ? pages[route as keyof typeof pages] : undefined;
  if (!Page) notFound();
  return <Page english />;
}
