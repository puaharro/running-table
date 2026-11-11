import { publicRaces } from "@/data/races";
import { racePdfFilename } from "@/lib/race-day";
import { createRacePdf } from "@/lib/race-pdf";

export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return publicRaces.map((race) => ({ year: race.date.slice(0, 4), slug: race.slug }));
}

export async function GET(
  _request: Request,
  { params }: RouteContext<"/races/[year]/[slug]/race-day.pdf">,
) {
  const { year, slug } = await params;
  const race = publicRaces.find((item) => item.slug === slug && item.date.slice(0, 4) === year);
  if (!race) return new Response(null, { status: 404 });

  return new Response(await createRacePdf(race), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${racePdfFilename(race)}"`,
    },
  });
}
