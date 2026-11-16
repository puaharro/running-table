import { publicRaces } from "@/data/races";
import { racePdfResponse } from "@/lib/race-pdf-response";

export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return publicRaces.map((race) => ({ year: race.date.slice(0, 4), slug: race.slug }));
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ year: string; slug: string }> },
) {
  return racePdfResponse(await params, true);
}
