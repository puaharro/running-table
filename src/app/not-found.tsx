import Link from "next/link";
export default function NotFound() {
  return (
    <main id="main" className="shell not-found">
      <div className="eyebrow">404 / OFF THE ROUTE</div>
      <h1>呢個頁面唔喺路線上。</h1>
      <p>連結可能有誤，返去總覽再搵下一場。</p>
      <Link className="button button-dark" href="/">
        返回賽事總覽 →
      </Link>
    </main>
  );
}
