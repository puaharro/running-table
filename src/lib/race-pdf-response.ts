import { publicRaces } from "@/data/races";
import { racePdfFilename } from "@/lib/race-day";
import { createRacePdf } from "@/lib/race-pdf";

export async function racePdfResponse(
  { year, slug }: { year: string; slug: string },
  english = false,
) {
  const race = publicRaces.find((item) => item.slug === slug && item.date.slice(0, 4) === year);
  if (!race) return new Response(null, { status: 404 });

  return new Response(await createRacePdf(race, english), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${racePdfFilename(race)}"`,
    },
  });
}
