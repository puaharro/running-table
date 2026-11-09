"use client";

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
}: {
  context: string;
  basis: string;
  onDirty: (dirty: boolean) => void;
}) {
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
      <h6>人工備註</h6>
      <p>
        只儲存於此瀏覽器及此網站位址，未上傳或跨裝置同步；清除網站資料會遺失備註，請匯出備份。不影響編輯總評分。
      </p>
      {latest && latest.basis !== basis && (
        <p role="alert">原文或來源資料已變動，這份備註需要重新核對。歷史版本保留當時依據。</p>
      )}
      <label htmlFor={`${id}-differences`}>留言差異</label>
      <textarea
        id={`${id}-differences`}
        maxLength={2000}
        value={differences}
        onChange={(event) => setDifferences(event.target.value)}
      />
      <label htmlFor={`${id}-verification`}>待核實事項</label>
      <textarea
        id={`${id}-verification`}
        maxLength={2000}
        value={verification}
        onChange={(event) => setVerification(event.target.value)}
      />
      <p>
        {dirty ? "有未儲存修改" : "未有待儲存修改"} · 每欄最多 2,000 字。清空再儲存亦會保留歷史。
      </p>
      <button type="button" disabled={!ready || (!dirty && latest?.basis === basis)} onClick={save}>
        儲存備註
      </button>{" "}
      <button type="button" onClick={backup}>
        匯出本主題備註及歷史
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
        還原已儲存版本
      </button>
      <p role="status">{message}</p>
      <details>
        <summary>修改歷史（{note.history.length} 個版本）</summary>
        {[...note.history].reverse().map((revision) => (
          <article key={revision.revision}>
            <strong>
              版本 {revision.revision} ·{" "}
              <time dateTime={revision.at}>
                {new Date(revision.at).toLocaleString("zh-HK", { timeZone: "Asia/Hong_Kong" })} HKT
              </time>
            </strong>
            <p style={{ whiteSpace: "pre-wrap" }}>留言差異：{revision.differences || "（空白）"}</p>
            <p style={{ whiteSpace: "pre-wrap" }}>
              待核實事項：{revision.verification || "（空白）"}
            </p>
            <details>
              <summary>儲存時的原文及來源</summary>
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
