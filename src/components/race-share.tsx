"use client";
import { language } from "@/lib/english-races";

import { useId, useRef, useState } from "react";
import { RaceDialog } from "./race-dialog";
import { siteUrl } from "@/lib/site";
import { Icon } from "./ui";

export function RaceShare({
  name,
  href,
  english = false,
}: {
  name: string;
  href: string;
  english?: boolean;
}) {
  const t = language(english);
  const fieldId = useId();
  const field = useRef<HTMLInputElement>(null);
  const request = useRef(0);
  const [url, setUrl] = useState("");
  const [nativeShare, setNativeShare] = useState(false);
  const [feedback, setFeedback] = useState<"copied" | "manual" | "share-error" | null>(null);

  async function share() {
    const attempt = ++request.current;
    try {
      await navigator.share({ title: name, url });
    } catch (error) {
      if (
        attempt === request.current &&
        !(error instanceof DOMException && error.name === "AbortError")
      ) {
        setFeedback("share-error");
      }
    }
  }

  async function copy() {
    const attempt = ++request.current;
    try {
      await navigator.clipboard.writeText(url);
      if (attempt === request.current) setFeedback("copied");
    } catch {
      if (attempt !== request.current) return;
      field.current?.focus();
      field.current?.select();
      setFeedback("manual");
    }
  }

  return (
    <RaceDialog
      english={english}
      title={t("分享賽事", "Share race")}
      onOpen={() => {
        request.current += 1;
        setUrl(new URL(href, siteUrl || window.location.origin).href);
        setNativeShare(typeof navigator.share === "function");
        setFeedback(null);
      }}
    >
      <p className="race-dialog-name">{name}</p>
      <label className="race-share-url" htmlFor={fieldId}>
        {t("賽事網址", "Race URL")}
        <input id={fieldId} ref={field} value={url} readOnly onFocus={(e) => e.target.select()} />
      </label>
      <div className="race-dialog-actions">
        {nativeShare && (
          <button className="button button-dark" type="button" onClick={share}>
            {t("開啟分享選單", "Open sharing options")}
          </button>
        )}
        <button
          className="button race-copy-button"
          type="button"
          onClick={copy}
          data-copied={feedback === "copied"}
        >
          {feedback === "copied" ? (
            <>
              {t("已複製", "Copied")} <Icon name="check" size={16} />
            </>
          ) : (
            t("複製網址", "Copy URL")
          )}
        </button>
      </div>
      <p role="status" className="race-share-status">
        {feedback === "copied"
          ? t("已複製賽事網址。", "Race URL copied.")
          : feedback === "manual"
            ? t("請手動複製已選取的網址。", "Copy the selected URL manually.")
            : feedback === "share-error"
              ? t(
                  "未能開啟分享選單，可以複製網址。",
                  "Sharing options could not open. You can copy the URL.",
                )
              : null}
      </p>
    </RaceDialog>
  );
}
