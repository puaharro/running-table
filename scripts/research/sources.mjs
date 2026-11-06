import { createHash } from "node:crypto";
import { isIP } from "node:net";

export const SOURCES = {
  threads: { label: "Threads", domains: ["threads.com", "threads.net"] },
  marathonsworld: { label: "Marathon’s World", domains: ["marathonsworld.com"] },
  facebook: { label: "Facebook 公開帖", domains: ["facebook.com"] },
  instagram: { label: "Instagram 公開帖", domains: ["instagram.com"] },
  youtube: { label: "YouTube Vlog／留言", domains: ["youtube.com", "youtu.be"] },
  biji: { label: "運動筆記", domains: ["running.biji.co"] },
  blog: { label: "個人網誌", domains: [] },
};
const belongs = (host, domain) => host === domain || host.endsWith("." + domain);
const hash = (text) => createHash("sha256").update(text).digest("hex");

// Validate and identify submitted links only; never fetch or authenticate to a source.
export function publicReference(platform, value) {
  if (!Object.hasOwn(SOURCES, platform) || typeof value !== "string" || value.length > 2000)
    throw new Error("請選擇來源平台並貼上完整 HTTPS 原帖連結。");
  let url;
  try {
    url = new URL(value.trim());
  } catch {
    throw new Error("來源連結格式無效。");
  }
  const host = url.hostname.toLowerCase();
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.port ||
    isIP(host.replace(/^\[|\]$/g, "")) ||
    !host.includes(".") ||
    /(?:^|\.)(?:localhost|local|internal|test|invalid)$/.test(host)
  )
    throw new Error("只接受公開網站的 HTTPS 連結，不接受登入資料或本機網址。");
  const detected = Object.entries(SOURCES).find(([, source]) =>
    source.domains.some((d) => belongs(host, d)),
  )?.[0];
  if ((platform === "blog" && detected) || (platform !== "blog" && detected !== platform))
    throw new Error("連結與所選平台不符。");
  let identity;
  if (platform === "threads") {
    const match = url.pathname.match(/^\/(?:@[^/]+\/post|t)\/([\w-]+)\/?$/);
    if (!match) throw new Error("請使用 Threads 原帖／留言連結。");
    identity = "threads-shortcode:" + match[1];
    url = new URL(`https://www.threads.com${url.pathname.replace(/\/$/, "")}`);
  } else if (platform === "youtube") {
    const id =
      host === "youtu.be"
        ? url.pathname.slice(1)
        : url.pathname === "/watch"
          ? url.searchParams.get("v")
          : url.pathname.match(/^\/(?:shorts|live)\/([\w-]+)\/?$/)?.[1];
    if (!id || !/^[\w-]{11}$/.test(id)) throw new Error("請使用 YouTube 影片或留言連結。");
    const comment = url.searchParams.get("lc");
    const at = url.searchParams.get("t");
    url = new URL("https://www.youtube.com/watch");
    url.searchParams.set("v", id);
    if (comment) url.searchParams.set("lc", comment);
    if (at) url.searchParams.set("t", at);
    // A video timestamp is context, not a separate comment or participant.
    identity = `youtube:${id}:${comment ?? "video"}`;
  } else {
    if (url.pathname === "/" || /\/(?:login|accounts\/login|search)\/?$/i.test(url.pathname))
      throw new Error("請貼原帖／文章連結，而非首頁、登入頁或搜尋頁。");
    if (
      platform === "marathonsworld" &&
      (!/^\/artapp\/(?:rating_detail|racedetail)\.php$/.test(url.pathname) ||
        !/^\d+$/.test(url.searchParams.get("rid") ?? ""))
    )
      throw new Error("請使用 Marathon’s World 賽事或獨立評價頁。");
    if (platform === "instagram" && !/^\/(?:p|reel|tv)\/[\w-]+(?:\/.*)?$/.test(url.pathname))
      throw new Error("請使用 Instagram 原帖或短片連結。");
    // Keep comment IDs, fragments and article query IDs. For arbitrary blogs,
    // preserve the submitted path/query because their URL semantics are unknown.
    if (platform !== "blog") {
      for (const name of [...url.searchParams.keys()])
        if (/^(utm_|fbclid$|igsh$|igshid$|mibextid$|si$)/i.test(name))
          url.searchParams.delete(name);
      url.hostname = host.replace(/^(?:www|m|web)\./, "");
      url.pathname = url.pathname.replace(/\/$/, "");
      url.searchParams.sort();
    }
    identity = `${platform}:${url.href}`;
  }
  return { id: `manual-${hash(identity)}`, url: url.href, platform };
}

export function evidenceLink(record) {
  const raw = record.raw ?? {};
  if (raw.source_platform && raw.ingestion_method === "manual_paste") {
    try {
      return publicReference(raw.source_platform, record.permalink ?? raw.source_post_url).url;
    } catch {
      return null;
    }
  }
  // Preserve the existing Threads-only trust boundary for old/API records.
  try {
    const u = new URL(record.permalink ?? raw.source_post_url);
    return u.protocol === "https:" &&
      !u.username &&
      !u.password &&
      !u.port &&
      ["threads.com", "www.threads.com", "threads.net", "www.threads.net"].includes(u.hostname)
      ? u.href
      : null;
  } catch {
    return null;
  }
}

export function sourceMetadata(raw) {
  if (!raw?.source_platform) return null;
  return {
    platform: raw.source_platform,
    label: SOURCES[raw.source_platform]?.label ?? "來源未知",
    posted_date: raw.timestamp ?? null,
    event_page_year: raw.event_page_year ?? null,
    group: raw.race_group ?? null,
    runner_segment: raw.runner_segment ?? "unknown",
    experience: raw.experience ?? "unknown",
  };
}

export function metadataText(raw) {
  const meta = raw?.platform ? raw : sourceMetadata(raw);
  if (!meta) return "";
  return `${meta.label} · 出帖：${meta.posted_date ?? "未知"} · 來源專頁屆次：${meta.event_page_year ?? "未知"} · 組別：${meta.group ?? "未知"} · 位置：${{ front: "前段", middle: "中段", back: "後段" }[meta.runner_segment] ?? "未知"} · 經驗：${{ self_reported: "作者自述參賽（未獨立核實）", secondhand: "轉述", organizer: "大會／宣傳來源" }[meta.experience] ?? "未知"}`;
}
