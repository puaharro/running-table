import Link from "next/link";

export default function NotFound() {
  return (
    <main id="main" className="shell not-found">
      <div className="not-found-signpost">
        <span className="not-found-code">404</span>
        <h1>搵唔到呢個頁面</h1>
        <p>可以用賽事名或地點重新搜尋。</p>
        <form action="/races/" className="not-found-search" role="search">
          <label htmlFor="missing-race-search">賽事名或地點</label>
          <div>
            <input id="missing-race-search" name="q" type="search" maxLength={200} required />
            <input type="hidden" name="view" value="all" />
            <button type="submit" className="button button-dark">
              搜尋賽事
            </button>
          </div>
        </form>
        <Link className="button" href="/races/">
          睇完整時間表 →
        </Link>
      </div>
    </main>
  );
}
