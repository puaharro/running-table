import Link from "next/link";
import type { Guide } from "@/data/guides";
import { siteName } from "@/lib/site";

export function Icon({
  name,
  size = 18,
}: {
  name: "search" | "arrow" | "pin" | "filter" | "calendar" | "check" | "clock";
  size?: number;
}) {
  const paths = {
    search: (
      <>
        <circle cx="10.8" cy="10.8" r="6.8" />
        <path d="m16 16 4.5 4.5" />
      </>
    ),
    arrow: (
      <>
        <path d="M5 12h14M13 6l6 6-6 6" />
      </>
    ),
    pin: (
      <>
        <path d="M20 10c0 6-8 11-8 11S4 16 4 10a8 8 0 1 1 16 0Z" />
        <circle cx="12" cy="10" r="2.5" />
      </>
    ),
    filter: (
      <>
        <path d="M4 6h16M4 12h16M4 18h16" />
        <circle cx="8" cy="6" r="2" fill="currentColor" />
        <circle cx="16" cy="12" r="2" fill="currentColor" />
        <circle cx="10" cy="18" r="2" fill="currentColor" />
      </>
    ),
    calendar: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M7 3v4M17 3v4M3 11h18M7 15h3M14 15h3" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}
export function Header() {
  return (
    <>
      <a className="skip-link" href="#main">
        跳到主要內容
      </a>
      <div className="prototype-strip">
        資料核實提示 <span>報名狀態只對應所列渠道，付款前請向大會再次確認。</span>
      </div>
      <header className="site-header">
        <div className="shell header-inner">
          <Link className="brand" href="/" aria-label={`${siteName} 首頁`}>
            <span className="brand-mark">
              <i />
              <i />
              <i />
            </span>
            <span className="brand-wordmark">{siteName}</span>
          </Link>
          <nav aria-label="主要導航">
            <Link href="/">首頁</Link>
            <Link href="/races/">賽事搜尋／時間表</Link>
            <Link href="/ratings/">體驗評級</Link>
            <Link href="/guides/">報名及選賽指南</Link>
            <Link href="/about/">關於{siteName}</Link>
          </nav>
          <span className="header-note">香港路跑 · 一站掌握</span>
        </div>
      </header>
    </>
  );
}
export function Footer() {
  return (
    <footer className="site-footer">
      <div className="shell footer-main">
        <div>
          <Link href="/" className="footer-brand">
            <span className="brand-wordmark">{siteName}</span>
          </Link>
          <p>你嘅下一場比賽，由呢度開始。</p>
          <p className="muted">香港路跑資訊網站 · 官方來源整理</p>
        </div>
        <div className="footer-links">
          <Link href="/races/">賽事搜尋／時間表</Link>
          <Link href="/ratings/">體驗評級</Link>
          <Link href="/guides/">原創指南</Link>
          <Link href="/about/">關於及資料政策</Link>
          <Link href="/privacy/">私隱說明</Link>
        </div>
      </div>
      <div className="shell footer-bottom">
        <span>© 2026 {siteName}</span>
        <span>獨立資訊整理 · 報名及名額安排以大會公告為準</span>
      </div>
    </footer>
  );
}
export const showAdPlaceholders = process.env.NEXT_PUBLIC_SHOW_AD_PLACEHOLDERS === "true";
export function AdSlot({
  format = "inline",
}: {
  format?: "inline" | "sidebar-tall" | "sidebar-box";
}) {
  if (!showAdPlaceholders) return null;
  return (
    <aside
      className={`ad-slot ad-slot--${format}`}
      aria-label={format === "inline" ? "內容廣告版位預留" : "側欄廣告版位預留"}
    >
      <span>ADVERTISEMENT</span>
      <p>{format === "inline" ? "廣告版位預留" : "側欄廣告版位預留"}</p>
      {format !== "inline" && (
        <strong className="ad-size-label">
          {format === "sidebar-tall" ? "300 × 600" : "300 × 250"}
        </strong>
      )}
      <small>尚未接入 Google AdSense</small>
    </aside>
  );
}
export function AdSidebar({ format = "sidebar-box" }: { format?: "sidebar-tall" | "sidebar-box" }) {
  if (!showAdPlaceholders) return null;
  return (
    <div className="ad-rail">
      <AdSlot format={format} />
      <p className="ad-rail-note">廣告位預覽 · 窄畫面自動調整</p>
    </div>
  );
}
export function GuideCard({ guide }: { guide: Guide }) {
  return (
    <Link className={`guide-card ${guide.accent}`} href={`/guides/${guide.slug}/`}>
      <div className="guide-graphic" aria-hidden="true">
        <span>
          {guide.category === "報名指南"
            ? "READY."
            : guide.relatedDistance === "半馬"
              ? "21.1"
              : "10K"}
        </span>
        <i />
        <i />
        <i />
      </div>
      <div className="guide-card-body">
        <div className="eyebrow">
          {guide.category}
          <span>{guide.readMinutes} 分鐘閱讀</span>
        </div>
        <h3>{guide.title}</h3>
        <p>{guide.description}</p>
        <span className="text-link">
          閱讀指南 <Icon name="arrow" size={16} />
        </span>
      </div>
    </Link>
  );
}
export function Breadcrumb({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav className="breadcrumbs" aria-label="所在位置">
      <Link href="/">首頁</Link>
      {items.map((item, i) => (
        <span key={i}>
          <span aria-hidden="true"> / </span>
          {item.href ? (
            <Link href={item.href}>{item.label}</Link>
          ) : (
            <span aria-current={i === items.length - 1 ? "page" : undefined}>{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
