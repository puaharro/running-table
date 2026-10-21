import { guides } from "@/data/guides";
import { Breadcrumb, GuideCard } from "@/components/ui";
import { pageMetadata } from "@/lib/site";
export const metadata = pageMetadata("原創報名及選賽指南", "由報名清單到選賽比較，幫香港跑手掌握需要核實嘅資訊。", "/guides/");
export default function GuidesPage() { return <main id="main" className="content-main shell"><Breadcrumb items={[{label:"報名及選賽指南"}]}/><div className="page-heading"><div className="eyebrow">THE RUNNER'S READING LIST</div><h1>起跑之前，<br/>做個有準備嘅決定。</h1><p>由第一場路跑到下一場半馬，整理實用嘅報名及選賽方法。</p></div><div className="guide-grid">{guides.map(g=><GuideCard key={g.slug} guide={g}/>)}</div><p className="editorial-note">全部文章為本站原創。個別賽事日期、資格、費用及條款，以大會當屆正式公告為準。</p></main>; }
