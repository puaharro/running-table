"use client";

import { useEffect, useRef, useState } from "react";

const enabled = process.env.NEXT_PUBLIC_SHOW_AD_PLACEHOLDERS === "true";
const anchorDismissedKey = "rundates:ads:anchor-dismissed";

export function AdFrame({ children }: { children: React.ReactNode }) {
  const [anchorVisible, setAnchorVisible] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (!enabled) return;
    const restore = () => {
      try {
        setAnchorVisible(window.sessionStorage.getItem(anchorDismissedKey) !== "true");
      } catch {
        setAnchorVisible(true);
      }
    };
    restore();
    window.addEventListener("pageshow", restore);
    return () => window.removeEventListener("pageshow", restore);
  }, []);
  function dismissAnchor() {
    setAnchorVisible(false);
    try {
      window.sessionStorage.setItem(anchorDismissedKey, "true");
    } catch {
      /* Closing remains available when browser storage is blocked. */
    }
  }
  if (!enabled) return children;
  return (
    <div className={`ad-page-frame${anchorVisible ? " has-bottom-anchor" : ""}`}>
      {(["left", "right"] as const).map((side) => (
        <aside
          key={side}
          className={`outer-ad-rail outer-ad-rail--${side}`}
          aria-label={`${side === "left" ? "左" : "右"}側廣告版位預留`}
        >
          <span>ADVERTISEMENT</span>
          <strong>{side === "left" ? "左" : "右"}側廣告位</strong>
          <span className="outer-ad-size" />
          <small>尚未接入 Google AdSense</small>
        </aside>
      ))}
      <div className="ad-page-content">{children}</div>
      {anchorVisible && (
        <aside className="bottom-ad-anchor" aria-label="底部廣告預覽">
          <button
            className="ad-close"
            type="button"
            aria-label="關閉底部廣告預覽"
            onClick={dismissAnchor}
          >
            ×
          </button>
          <div className="anchor-ad-art" aria-hidden="true">
            AD
          </div>
          <div className="anchor-ad-copy">
            <small>廣告版位預覽</small>
            <strong>
              <span className="anchor-mobile-label">手機底部固定橫幅</span>
              <span className="anchor-desktop-label">電腦底部固定橫幅</span>
            </strong>
            <span className="anchor-desktop-note">響應式廣告版位 · 尚未接入 Google AdSense</span>
            <button type="button" onClick={() => dialog.current?.showModal()}>
              查看全屏廣告示意 ↗
            </button>
          </div>
        </aside>
      )}
      <dialog ref={dialog} className="ad-vignette" aria-labelledby="vignette-title">
        <div className="vignette-toolbar">
          <span>廣告預覽 · 尚未接入 AdSense</span>
          <button
            className="ad-close"
            type="button"
            autoFocus
            aria-label="關閉全屏廣告預覽"
            onClick={() => dialog.current?.close()}
          >
            ×
          </button>
        </div>
        <div className="vignette-art">
          <span>ADVERTISEMENT</span>
          <div className="vignette-number" aria-hidden="true">
            AD
          </div>
          <h2 id="vignette-title">全屏廣告版位</h2>
          <p>
            你嘅下一步，
            <br />
            由呢度開始。
          </p>
          <small>插頁廣告示意 · 可隨時關閉</small>
        </div>
        <button className="vignette-return" type="button" onClick={() => dialog.current?.close()}>
          關閉並繼續瀏覽
        </button>
      </dialog>
    </div>
  );
}
