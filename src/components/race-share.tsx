"use client";

import { useId, useRef, useState } from "react";
import { RaceDialog } from "./race-dialog";
import { siteUrl } from "@/lib/site";

export function RaceShare({ name, href }: { name: string; href: string }) {
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
        setMessage("未能開啟分享選單，可以複製網址。");
      }
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setMessage("已複製賽事網址。");
    } catch {
      field.current?.focus();
      field.current?.select();
      setMessage("請手動複製已選取嘅網址。");
    }
  }

  return (
    <RaceDialog
      title="分享賽事"
      onOpen={() => {
        setUrl(new URL(href, siteUrl || window.location.origin).href);
        setNativeShare(typeof navigator.share === "function");
        setMessage("");
      }}
    >
      <p className="race-dialog-name">{name}</p>
      <label className="race-share-url" htmlFor={fieldId}>
        賽事網址
        <input id={fieldId} ref={field} value={url} readOnly onFocus={(e) => e.target.select()} />
      </label>
      <div className="race-dialog-actions">
        {nativeShare && (
          <button className="button button-dark" type="button" onClick={share}>
            開啟分享選單
          </button>
        )}
        <button className="button" type="button" onClick={copy}>
          複製網址
        </button>
      </div>
      <p role="status" className="race-share-status">
        {message}
      </p>
    </RaceDialog>
  );
}
