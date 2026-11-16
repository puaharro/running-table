export function correctionUrl(
  input: {
    raceName: string;
    racePath: string;
    details: string;
    sourceUrl: string;
    contactEmail?: string;
  },
  english = false,
) {
  const source = new URL(input.sourceUrl);
  if (source.protocol !== "https:" || source.username || source.password)
    throw new Error("請提供 HTTPS 官方公告連結。");
  const title = english
    ? `Race information correction: ${input.raceName}`
    : `資料更正：${input.raceName}`;
  const body = english
    ? `Race: ${input.raceName}\nRace page: ${input.racePath}\n\nCorrection requested:\n${input.details.trim()}\n\nOfficial announcement: ${source.href}`
    : `賽事：${input.raceName}\n網站頁面：${input.racePath}\n\n需要更正的內容：\n${input.details.trim()}\n\n官方公告：${source.href}`;
  if (input.contactEmail) {
    return `mailto:${input.contactEmail}?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`;
  }
  const url = new URL("https://github.com/puaharro/running-table/issues/new");
  url.search = new URLSearchParams({ title, body }).toString();
  return url.toString();
}
