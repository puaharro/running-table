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

function dateRange(from: string, to = from) {
  const fullDate = (date: string) => displayDate(date, { year: "numeric" });
  return from === to ? fullDate(from) : `${fullDate(from)} 至 ${fullDate(to)}`;
}

export async function createRacePdf(race: Race): Promise<Uint8Array<ArrayBuffer>> {
  font ??= readFile(resolve("assets/pdf/NotoSansHK-450.ttf.gz")).then(gunzipSync);
  const fontData = await font;
  const doc = new PDFDocument({
    size: "A4",
    margin: 48,
    lang: "zh-HK",
    info: { Title: race.name, Author: "NXTGO", Subject: "賽日資料" },
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
  text("NXTGO  /  賽日資料", 12, accent);
  doc.moveDown(0.8);
  text(race.name, 24);
  if (race.englishName) text(race.englishName, 11, secondary);
  doc.moveDown(0.6);
  text(`比賽日期  ${dateRange(race.date, race.endDate)}`, 13);

  const notice = race.announcement;
  if (notice) {
    heading(raceAnnouncementTitles[notice.kind]);
    text(notice.summary);
    const source = race.sources?.find((item) => item.id === notice.sourceId);
    if (source) {
      text(`官方公告 · 核對：${formatTimestamp(source.checkedAt)} HKT`, 10, accent, {
        link: source.url,
        underline: true,
      });
    }
  }

  heading("參賽組別");
  for (const group of race.groups) {
    const start = group.startTime ? ` · ${formatTimestamp(group.startTime)} HKT` : "";
    text(`${group.name} · ${dateRange(group.date, group.endDate)}${start}`, 11, ink, {
      paragraphGap: 4,
    });
  }

  heading("交通及集合");
  for (const { venue, names } of verifiedStarts(race)) {
    text(names.length ? `${names.join("／")} · ${venue}` : venue, 11, ink, { paragraphGap: 4 });
  }
  text(race.transport, 11, secondary);

  heading("核實資料");
  if (race.verifiedAt) text(`資料核對：${formatTimestamp(race.verifiedAt)} HKT`, 10, secondary);
  text("出發前請確認大會最新安排。", 10, secondary);
  if (race.sourceUrl) {
    text("大會官方網站", 10, accent, { link: race.sourceUrl, underline: true });
    text(race.sourceUrl, 9, secondary);
  }

  doc.end();
  return output;
}
