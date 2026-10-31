import { editorialContactEmail } from "./editorial-contact";
export interface ReleaseSettings {
  indexable: boolean;
  origin?: string;
  contactEmail?: string;
  operatorName?: string;
}
export function releaseIssues(settings: ReleaseSettings) {
  const issues: string[] = [];
  if (!settings.indexable) return issues;
  try {
    const url = new URL(settings.origin ?? "");
    if (
      url.protocol !== "https:" ||
      url.pathname !== "/" ||
      url.search ||
      url.hash ||
      url.username ||
      url.password
    )
      issues.push("正式網域必須係無路徑嘅 HTTPS origin。");
  } catch {
    issues.push("缺少正式網域 NEXT_PUBLIC_SITE_URL。");
  }
  if (!settings.contactEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(settings.contactEmail))
    issues.push("缺少有效公開聯絡電郵 SITE_CONTACT_EMAIL。");
  if (!settings.operatorName?.trim()) issues.push("缺少真實營運者名稱 SITE_OPERATOR_NAME。");
  return issues;
}
export const releaseSettings: ReleaseSettings = {
  indexable: process.env.SITE_INDEXABLE === "true",
  origin: process.env.NEXT_PUBLIC_SITE_URL,
  contactEmail: process.env.SITE_CONTACT_EMAIL || editorialContactEmail,
  operatorName: process.env.SITE_OPERATOR_NAME,
};
export function assertReleaseReady() {
  const issues = releaseIssues(releaseSettings);
  if (issues.length) throw new Error(`網站未符合搜尋收錄設定：\n${issues.join("\n")}`);
}
