import { englishRaceTerm } from "@/lib/race-terms.en";

export function RaceDataText({
  value,
  english = false,
  original = false,
}: {
  value?: string | null;
  english?: boolean;
  original?: boolean;
}) {
  if (!value) return null;
  const text = original ? value : englishRaceTerm(value, english);
  return english && /\p{Script=Han}/u.test(text) ? <span lang="zh-HK">{text}</span> : text;
}
