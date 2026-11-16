import { englishDate, englishTimestamp, language } from "./english-races";
import { englishRaceTerm } from "./race-terms.en";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import PDFDocument from "pdfkit";
import { raceAnnouncementTitles, verifiedStarts } from "./race-day";
import { displayDate, formatTimestamp } from "./races";
import type { Race } from "./types";

const ink = "#26364c";
const secondary = "#526174";
const accent = "#4c6283";
let font: Promise<Buffer> | undefined;

export async function createRacePdf(race: Race, english = false): Promise<Uint8Array<ArrayBuffer>> {
  const t = language(english);
  const term = (value: string) => englishRaceTerm(value, english);
  const name = english ? race.englishName : race.name;
  const date = (value: string) =>
    english ? englishDate(value) : displayDate(value, { year: "numeric" });
  const timestamp = (value: string) =>
    english ? englishTimestamp(value) : `${formatTimestamp(value)} HKT`;
  const dateRange = (from: string, to = from) =>
    from === to ? date(from) : `${date(from)}${t(" 至 ", " – ")}${date(to)}`;
  font ??= readFile(resolve("assets/pdf/NotoSansHK-450.ttf.gz")).then(gunzipSync);
  const fontData = await font;
  const doc = new PDFDocument({
    size: "A4",
    margin: 48,
    lang: t("zh-HK", "en"),
    info: { Title: name, Author: "NXTGO", Subject: t("賽日資料", "Race day information") },
  });

  const chunks: Buffer[] = [];
  const output = new Promise<Uint8Array<ArrayBuffer>>((resolve, reject) => {
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.once("end", () => resolve(new Uint8Array(Buffer.concat(chunks))));
    doc.once("error", reject);
  });

  function text(value: string, size = 11, color = ink, options?: PDFKit.Mixins.TextOptions) {
    doc
      .fontSize(size)
      .fillColor(color)
      .text(value, { lineGap: 3, ...options });
  }

  function heading(value: string) {
    doc.fontSize(15);
    if (doc.y + 56 > doc.page.height - doc.page.margins.bottom) doc.addPage();
    doc.moveDown(0.7);
    text(value, 15, accent);
    doc.moveDown(0.35);
  }

  doc.font(fontData);
  text(t("NXTGO  /  賽日資料", "NXTGO  /  RACE DAY"), 12, accent);
  doc.moveDown(0.8);
  text(name, 24);
  if (!english && race.englishName) text(race.englishName, 11, secondary);
  doc.moveDown(0.6);
  text(`${t("比賽日期", "Race date")}  ${dateRange(race.date, race.endDate)}`, 13);

  const notice = race.announcement;
  if (notice) {
    heading(term(raceAnnouncementTitles[notice.kind]));
    text(term(notice.summary));
    const source = race.sources?.find((item) => item.id === notice.sourceId);
    if (source) {
      text(
        `${t("官方公告 · 核對：", "Official announcement · Checked: ")}${timestamp(source.checkedAt)}`,
        10,
        accent,
        {
          link: source.url,
          underline: true,
        },
      );
    }
  }

  heading(t("參賽組別", "Race categories"));
  for (const group of race.groups) {
    const start = group.startTime ? ` · ${timestamp(group.startTime)}` : "";
    text(`${term(group.name)} · ${dateRange(group.date, group.endDate)}${start}`, 11, ink, {
      paragraphGap: 4,
    });
  }

  heading(t("交通及集合", "Transport and assembly"));
  for (const { venue, names } of verifiedStarts(race)) {
    text(
      names.length ? `${names.map(term).join(t("／", " / "))} · ${term(venue)}` : term(venue),
      11,
      ink,
      { paragraphGap: 4 },
    );
  }
  text(term(race.transport), 11, secondary);

  heading(t("核實資料", "Verification"));
  if (race.verifiedAt)
    text(`${t("資料核對：", "Checked: ")}${timestamp(race.verifiedAt)}`, 10, secondary);
  text(
    t("出發前請確認大會最新安排。", "Check the organiser’s latest information before travelling."),
    10,
    secondary,
  );
  if (race.sourceUrl) {
    text(t("大會官方網站", "Official race website"), 10, accent, {
      link: race.sourceUrl,
      underline: true,
    });
    text(race.sourceUrl, 9, secondary);
  }

  doc.end();
  return output;
}
