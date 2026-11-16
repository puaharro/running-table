"use client";
import { language } from "@/lib/english-races";

import { useId, useRef, useState } from "react";
import { RaceDialog } from "./race-dialog";
import { siteUrl } from "@/lib/site";

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
  const [url, setUrl] = useState("");
  const [nativeShare, setNativeShare] = useState(false);
  const [message, setMessage] = useState("");

  async function share() {
    try {
      await navigator.share({ title: name, url });
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        setMessage(
          t(
            "未能開啟分享選單，可以複製網址。",
            "Sharing options could not open. You can copy the URL.",
          ),
        );
      }
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setMessage(t("已複製賽事網址。", "Race URL copied."));
    } catch {
      field.current?.focus();
      field.current?.select();
      setMessage(t("請手動複製已選取的網址。", "Copy the selected URL manually."));
    }
  }

  return (
    <RaceDialog
      english={english}
      title={t("分享賽事", "Share race")}
      onOpen={() => {
        setUrl(new URL(href, siteUrl || window.location.origin).href);
        setNativeShare(typeof navigator.share === "function");
        setMessage("");
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
        <button className="button" type="button" onClick={copy}>
          {t("複製網址", "Copy URL")}
        </button>
      </div>
      <p role="status" className="race-share-status">
        {message}
      </p>
    </RaceDialog>
  );
}
