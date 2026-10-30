"use client";
import { useEffect, useRef, useState } from "react";
import {
  blankDraft,
  exportNotebook,
  initialNotebook,
  notebookStorageKey,
  parseNotebook,
  type ReviewDraft,
} from "@/lib/review-notebook";
import {
  ratingDimensions,
  ratingPolicy,
  reviewTargets,
  scoreLabels,
  segmentLabels,
  type RatingDimension,
} from "@/lib/rating-policy";

export function ReviewNotebook() {
  const [notebook, setNotebook] = useState(initialNotebook);
  const [activeId, setActiveId] = useState("hzmb-half-first");
  const [ready, setReady] = useState(false);
  const [storageBlocked, setStorageBlocked] = useState(false);
  const [message, setMessage] = useState("");
  const [dirty, setDirty] = useState(false);
  const importInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(notebookStorageKey);
      if (saved) {
        const parsed = parseNotebook(saved);
        setNotebook(parsed);
        setActiveId(parsed.entries[0].id);
        setMessage("已讀取此裝置草稿。");
      }
    } catch {
      setStorageBlocked(true);
      setMessage("未能讀取此裝置草稿。原有內容未被覆蓋；可匯出目前筆記，或匯入備份繼續。");
    }
    setReady(true);
  }, []);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (dirty) event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  const active = notebook.entries.find((e) => e.id === activeId) ?? notebook.entries[0];
  const target = reviewTargets.find((t) => t.id === active.targetId)!;
  function update(patch: Partial<ReviewDraft>) {
    setNotebook((n) => ({
      ...n,
      entries: n.entries.map((e) => (e.id === active.id ? { ...e, ...patch } : e)),
    }));
    setDirty(true);
    setMessage("有未儲存修改。");
  }
  function dimensionUpdate(
    key: RatingDimension,
    patch: Partial<ReviewDraft["dimensions"][RatingDimension]>,
  ) {
    update({
      dimensions: { ...active.dimensions, [key]: { ...active.dimensions[key], ...patch } },
    });
  }
  function save() {
    try {
      window.localStorage.setItem(notebookStorageKey, exportNotebook(notebook));
      setDirty(false);
      setMessage("已儲存至此裝置；未發布。建議另行匯出備份。");
    } catch {
      setMessage("未能儲存，請匯出筆記備份。");
    }
  }
  function download() {
    try {
      const value = exportNotebook(notebook);
      const url = URL.createObjectURL(new Blob([value], { type: "application/json" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = "nxtgo-experience-notes.json";
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMessage("已產生筆記下載；請確認檔案已儲存。草稿不會自動發布。");
    } catch {
      setMessage("請確認年份為四位數，再匯出筆記。");
    }
  }
  async function importFile(file?: File) {
    if (!file) return;
    try {
      if (file.size > 2_000_000) throw new Error("too large");
      const imported = parseNotebook(await file.text());
      // Add imports as new entries, preserving all currently edited notes.
      const additions = imported.entries.map((e) => ({ ...e, id: crypto.randomUUID() }));
      if (notebook.entries.length + additions.length > 100) throw new Error("too many");
      setNotebook((n) => ({ ...n, entries: [...n.entries, ...additions] }));
      setActiveId(additions[0].id);
      setDirty(true);
      setMessage("已匯入為新增草稿，原有筆記保留；請儲存或匯出。");
    } catch {
      setMessage("未能匯入：請選擇有效的 NXTGO 筆記備份。現有筆記保留。");
    }
    if (importInput.current) importInput.current.value = "";
  }
  return (
    <div className="review-notebook">
      <p className="notebook-notice">
        筆記只會儲存在目前瀏覽器，唔會傳送到網站或自動發布。清除瀏覽資料會失去草稿，請匯出備份。
      </p>
      <fieldset disabled={!ready}>
        <legend>選擇參賽筆記</legend>
        <label>
          目前筆記
          <select value={active.id} onChange={(e) => setActiveId(e.target.value)}>
            {notebook.entries.map((e, i) => {
              const t = reviewTargets.find((t) => t.id === e.targetId)!;
              return (
                <option key={e.id} value={e.id}>
                  {t.name} · {t.group} · {e.year || "年份待填"} · 筆記 {i + 1}
                </option>
              );
            })}
          </select>
        </label>
        <div className="notebook-actions">
          {reviewTargets.map((t) => (
            <button
              type="button"
              key={t.id}
              onClick={() => {
                const entry = blankDraft(t.id, crypto.randomUUID());
                setNotebook((n) => ({ ...n, entries: [...n.entries, entry] }));
                setActiveId(entry.id);
                setDirty(true);
                setMessage("已新增草稿，每個年份獨立記錄。");
              }}
              disabled={notebook.entries.length >= 100}
            >
              新增{t.group}另一屆筆記
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset disabled={!ready}>
        <legend>
          {target.name} · {target.group}
        </legend>
        <p>每次只記一個年份；跑過多屆可新增另一份筆記。唔記得嘅細節可以留空。</p>
        <div className="notebook-fields">
          <label>
            參賽年份
            <input
              inputMode="numeric"
              maxLength={4}
              placeholder="例如 2025"
              value={active.year}
              onChange={(e) => update({ year: e.target.value })}
            />
          </label>
          <label>
            評審署名
            <input
              maxLength={100}
              value={active.reviewer}
              onChange={(e) => update({ reviewer: e.target.value })}
            />
          </label>
          <label>
            大約完賽位置
            <select
              value={active.runnerSegment}
              onChange={(e) =>
                update({ runnerSegment: e.target.value as ReviewDraft["runnerSegment"] })
              }
            >
              {Object.entries(segmentLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label>
          參賽／利益關係
          <input
            maxLength={1000}
            placeholder="例如自費參賽、獲贈名額；按實際情況填寫"
            value={active.disclosure}
            onChange={(e) => update({ disclosure: e.target.value })}
          />
        </label>
        <label>
          觀察範圍及記憶限制
          <textarea
            maxLength={12000}
            placeholder="例如只記得自己起跑批次，未觀察後段跑手；哪些細節需要再確認？"
            value={active.observationLimits}
            onChange={(e) => update({ observationLimits: e.target.value })}
          />
        </label>
        {ratingDimensions.map((key) => {
          const rule = ratingPolicy.dimensions[key];
          return (
            <section className="notebook-dimension" key={key} aria-label={`${rule.title}筆記`}>
              <h2>{rule.title}</h2>
              <p>{rule.prompt}</p>
              <label>
                {rule.title}實際經驗
                <textarea
                  maxLength={12000}
                  placeholder="用口語寫低優點、問題、位置／時間，以及適合邊類跑手。"
                  value={active.dimensions[key].notes}
                  onChange={(e) => dimensionUpdate(key, { notes: e.target.value })}
                />
              </label>
              <label>
                {rule.title}暫定分數
                <select
                  value={active.dimensions[key].score}
                  onChange={(e) => dimensionUpdate(key, { score: e.target.value })}
                >
                  <option value="">未評／稍後決定</option>
                  {rule.anchors.map((_, index) => (
                    <option key={index} value={index + 1}>
                      {index + 1} / 5 · {scoreLabels[index + 1]}
                    </option>
                  ))}
                </select>
              </label>
              <details>
                <summary>對照{rule.title}評分準則</summary>
                <ol>
                  {rule.anchors.map((anchor) => (
                    <li key={anchor}>{anchor}</li>
                  ))}
                </ol>
              </details>
            </section>
          );
        })}
        <label>
          賽道挑戰特性（獨立描述）
          <textarea
            maxLength={12000}
            placeholder="斜路、風、路面等；難跑唔等於體驗差，唔會加入三項評分。"
            value={active.courseNotes}
            onChange={(e) => update({ courseNotes: e.target.value })}
          />
        </label>
      </fieldset>
      <div className="notebook-actions">
        <button type="button" onClick={save} disabled={!ready || storageBlocked}>
          儲存此裝置草稿
        </button>
        <button type="button" onClick={download} disabled={!ready}>
          匯出筆記備份
        </button>
        <label className="notebook-import">
          匯入筆記備份
          <input
            ref={importInput}
            type="file"
            accept="application/json,.json"
            disabled={!ready}
            onChange={(e) => void importFile(e.target.files?.[0])}
          />
        </label>
      </div>
      <p role="status" aria-live="polite">
        {message || "未有修改。"}
      </p>
      <p>
        筆記可以先保留零散觀察。正式發布前，會整理成每項短評、優點／問題、適合對象及依據，並核對年份、組別與評審署名。
      </p>
    </div>
  );
}
