"use client";

import { language } from "@/lib/english-races";
import { useEffect, useId, useState } from "react";
import {
  noteStorageKey,
  parseLocalNote,
  saveLocalNote,
  type LocalNote,
} from "@/lib/comparison-local-notes";

export function ComparisonTopicNote({
  context,
  basis,
  onDirty,
  english = false,
}: {
  english?: boolean;
  context: string;
  basis: string;
  onDirty: (dirty: boolean) => void;
}) {
  const t = language(english);
  const [note, setNote] = useState<LocalNote>({ context, history: [] });
  const [differences, setDifferences] = useState("");
  const [verification, setVerification] = useState("");
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState("");
  const id = useId();
  const latest = note.history.at(-1);
  const dirty =
    differences !== (latest?.differences ?? "") || verification !== (latest?.verification ?? "");
  useEffect(() => {
    try {
      const saved = parseLocalNote(localStorage.getItem(noteStorageKey(context)), context);
      setNote(saved);
      setDifferences(saved.history.at(-1)?.differences ?? "");
      setVerification(saved.history.at(-1)?.verification ?? "");
      setReady(true);
    } catch {
      setMessage("無法讀取此瀏覽器備註，未有覆寫。請檢查瀏覽器儲存設定。");
    }
  }, [context]);
  useEffect(() => {
    onDirty(dirty);
    const handler = (event: BeforeUnloadEvent) => {
      if (dirty) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty, onDirty]);
  async function save() {
    try {
      const persist = () => {
        const saved = saveLocalNote(localStorage, context, note.history.length, {
          differences,
          verification,
          basis,
        });
        setNote(saved);
        setMessage(`已儲存版本 ${saved.history.length}（此瀏覽器）`);
      };
      if (navigator.locks) await navigator.locks.request(noteStorageKey(context), persist);
      else throw new Error("此瀏覽器未支援安全儲存備註，請改用較新版本瀏覽器。輸入仍保留。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "儲存失敗，輸入仍保留。");
    }
  }
  function backup() {
    try {
      const blob = new Blob(
        [
          JSON.stringify(
            {
              format: "nxtgo-comparison-note-v1",
              note,
              unsavedDraft: dirty ? { differences, verification, basis } : null,
            },
            null,
            2,
          ),
        ],
        { type: "application/json" },
      );
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "nxtgo-comparison-note.json";
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setMessage("匯出失敗，請先保留輸入文字。");
    }
  }
  return (
    <div className="comparison-topic-note">
      <h6>{t("人工備註", "Notes")}</h6>
      <p>
        {t(
          "只儲存於此瀏覽器及此網站位址，未上傳或跨裝置同步；清除網站資料會遺失備註，請匯出備份。",
          "Notes stay in this browser for this site and do not sync across devices. Export a backup before clearing site data.",
        )}
      </p>
      {latest && latest.basis !== basis && (
        <p role="alert">
          {t(
            "原文或來源資料已變動，這份備註需要重新核對。歷史版本保留當時依據。",
            "The original text or sources have changed. Review this note again. Earlier versions retain the evidence available at the time.",
          )}
        </p>
      )}
      <label htmlFor={`${id}-differences`}>{t("留言差異", "Differences between comments")}</label>
      <textarea
        id={`${id}-differences`}
        maxLength={2000}
        value={differences}
        onChange={(event) => setDifferences(event.target.value)}
      />
      <label htmlFor={`${id}-verification`}>{t("待核實事項", "Items to verify")}</label>
      <textarea
        id={`${id}-verification`}
        maxLength={2000}
        value={verification}
        onChange={(event) => setVerification(event.target.value)}
      />
      <p>
        {dirty ? t("有未儲存修改", "Unsaved changes") : t("未有待儲存修改", "No unsaved changes")}{" "}
        {t(
          "· 每欄最多 2,000 字。清空再儲存亦會保留歷史。",
          "· Up to 2,000 characters per field. Clearing a field and saving preserves the history.",
        )}
      </p>
      <button type="button" disabled={!ready || (!dirty && latest?.basis === basis)} onClick={save}>
        {t("儲存備註", "Save notes")}
      </button>{" "}
      <button type="button" onClick={backup}>
        {t("匯出本主題備註及歷史", "Export notes and version history")}
      </button>
      <button
        type="button"
        disabled={!ready || !dirty}
        onClick={() => {
          setDifferences(latest?.differences ?? "");
          setVerification(latest?.verification ?? "");
          setMessage("已還原至已儲存版本。");
        }}
      >
        {t("還原已儲存版本", "Restore saved version")}
      </button>
      <p role="status">{message}</p>
      <details>
        <summary>
          {t(
            `修改歷史（${note.history.length} 個版本）`,
            `History (${note.history.length} versions)`,
          )}
        </summary>
        {[...note.history].reverse().map((revision) => (
          <article key={revision.revision}>
            <strong>
              {t("版本 ", "Version ")}
              {revision.revision} ·{" "}
              <time dateTime={revision.at}>
                {new Date(revision.at).toLocaleString("zh-HK", { timeZone: "Asia/Hong_Kong" })} HKT
              </time>
            </strong>
            <p style={{ whiteSpace: "pre-wrap" }}>
              {t("留言差異：", "Differences between comments: ")}
              {revision.differences || "（空白）"}
            </p>
            <p style={{ whiteSpace: "pre-wrap" }}>
              {t("待核實事項：", "Items to verify: ")}
              {revision.verification || "（空白）"}
            </p>
            <details>
              <summary>
                {t("儲存時的原文及來源", "Original wording and sources at time of saving")}
              </summary>
              <pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
                {revision.basis}
              </pre>
            </details>
          </article>
        ))}
      </details>
    </div>
  );
}
