"use client";

import { language, localPath } from "@/lib/english-races";
import { englishRaceTerm } from "@/lib/race-terms.en";
import { useEffect, useRef, useState } from "react";
import { prepareReviewRequest } from "@/lib/review-request";
import Link from "next/link";
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

export function ReviewNotebook({ english = false }: { english?: boolean } = {}) {
  const t = language(english);
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
  function requestConfirmation() {
    try {
      const packet = prepareReviewRequest(active);
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(packet, null, 2)], { type: "application/json" }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = `nxtgo-review-request-${active.year}.json`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMessage(
        `待確認筆記已匯出，未發布。${packet.riskHints.length ? "有低分或敏感字眼，需額外人手覆核。" : "仍需整理完整稿件並由營運者確認。"}`,
      );
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "未能匯出待確認筆記。");
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
      <p>
        {t(
          "筆記流程：由草稿整理成待確認稿，經營運者確認後發布。",
          "Notes start as drafts. A review may be published once the site operator approves it.",
        )}
        <Link href={localPath("/ratings/process/", english)}>
          {t("了解審閱流程", "View the editorial process")}
        </Link>
      </p>
      <p className="notebook-notice">
        {t(
          "筆記只會儲存在目前瀏覽器，不會傳送至網站或自動發布。清除瀏覽資料會失去草稿，請匯出備份。",
          "Notes stay in this browser and are never automatically sent or published. Export a backup before clearing browser data.",
        )}
      </p>
      <fieldset disabled={!ready}>
        <legend>{t("選擇參賽筆記", "Choose race notes")}</legend>
        <label>
          {t("目前筆記", "Current draft")}
          <select value={active.id} onChange={(e) => setActiveId(e.target.value)}>
            {notebook.entries.map((e, i) => {
              const t = reviewTargets.find((t) => t.id === e.targetId)!;
              return (
                <option key={e.id} value={e.id}>
                  {english
                    ? `${englishRaceTerm(t.name, true)} (${englishRaceTerm(t.group, true)}, ${e.year || "year missing"}), draft ${i + 1}`
                    : `${t.name}（${t.group}，${e.year || "年份待填"}），筆記 ${i + 1}`}
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
              {english
                ? `New ${englishRaceTerm(t.group, true)} edition`
                : `新增${t.group}另一屆筆記`}
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset disabled={!ready}>
        <legend>
          {englishRaceTerm(target.name, english)} · {englishRaceTerm(target.group, english)}
        </legend>
        <p>
          {t(
            "每次只記一個年份；跑過多屆可新增另一份筆記。記憶不確切的細節可留空。",
            "Use one draft per edition. Create another for a different year. Leave details blank if you are unsure.",
          )}
        </p>
        <div className="notebook-fields">
          <label>
            {t("參賽年份", "Race year")}
            <input
              inputMode="numeric"
              maxLength={4}
              placeholder={t("例如 2025", "For example, 2025")}
              value={active.year}
              onChange={(e) => update({ year: e.target.value })}
            />
          </label>
          <label>
            {t("評審署名", "Reviewer byline")}
            <input
              maxLength={100}
              value={active.reviewer}
              onChange={(e) => update({ reviewer: e.target.value })}
            />
          </label>
          <label>
            {t("大約完賽位置", "Approximate position in the field")}
            <select
              value={active.runnerSegment}
              onChange={(e) =>
                update({ runnerSegment: e.target.value as ReviewDraft["runnerSegment"] })
              }
            >
              {Object.entries(segmentLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {englishRaceTerm(label, english)}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label>
          {t("參賽／利益關係", "Participation and conflicts of interest")}
          <textarea
            className="notebook-disclosure"
            rows={3}
            maxLength={1000}
            placeholder={t(
              "例如自費參賽、獲贈名額；按實際情況填寫",
              "For example, self-funded entry or a complimentary place.",
            )}
            value={active.disclosure}
            lang={english && /\p{Script=Han}/u.test(active.disclosure) ? "zh-HK" : undefined}
            onChange={(e) => update({ disclosure: e.target.value })}
          />
        </label>
        <label>
          {t("觀察範圍及記憶限制", "Scope of observation and limits of recall")}
          <textarea
            maxLength={12000}
            placeholder={t(
              "例如只記得自己起跑批次，未觀察後段跑手；哪些細節需要再確認？",
              "For example, you saw only your own wave. What still needs checking?",
            )}
            value={active.observationLimits}
            lang={english && /\p{Script=Han}/u.test(active.observationLimits) ? "zh-HK" : undefined}
            onChange={(e) => update({ observationLimits: e.target.value })}
          />
        </label>
        {ratingDimensions.map((key) => {
          const rule = ratingPolicy.dimensions[key];
          return (
            <section
              className="notebook-dimension"
              key={key}
              aria-label={t(`${rule.title}筆記`, `${englishRaceTerm(rule.title, true)} notes`)}
            >
              <h2>{englishRaceTerm(rule.title, english)}</h2>
              <p>{englishRaceTerm(rule.prompt, english)}</p>
              <label>
                {englishRaceTerm(rule.title, english)}
                {t("實際經驗", " observations")}
                <textarea
                  maxLength={12000}
                  placeholder={t(
                    "記錄優點、問題、發生地點或時間，以及適合的跑手類型。",
                    "Record what worked, what went wrong, where or when it happened, and who it suited.",
                  )}
                  value={active.dimensions[key].notes}
                  lang={
                    english && /\p{Script=Han}/u.test(active.dimensions[key].notes)
                      ? "zh-HK"
                      : undefined
                  }
                  onChange={(e) => dimensionUpdate(key, { notes: e.target.value })}
                />
              </label>
              <label>
                {englishRaceTerm(rule.title, english)}
                {t("暫定分數", " provisional score")}
                <select
                  value={active.dimensions[key].score}
                  onChange={(e) => dimensionUpdate(key, { score: e.target.value })}
                >
                  <option value="">{t("未評／稍後決定", "Unrated / decide later")}</option>
                  {rule.anchors.map((_, index) => (
                    <option key={index} value={index + 1}>
                      {index + 1} / 5 · {englishRaceTerm(scoreLabels[index + 1], english)}
                    </option>
                  ))}
                </select>
              </label>
              <details>
                <summary>
                  {t(
                    `對照${rule.title}評分準則`,
                    `${englishRaceTerm(rule.title, true)} rating criteria`,
                  )}
                </summary>
                <ol>
                  {rule.anchors.map((anchor) => (
                    <li key={englishRaceTerm(anchor, english)}>
                      {englishRaceTerm(anchor, english)}
                    </li>
                  ))}
                </ol>
              </details>
            </section>
          );
        })}
        <label>
          {t("賽道挑戰特性（獨立描述）", "Course challenges (separate from scores)")}
          <textarea
            maxLength={12000}
            placeholder={t(
              "斜路、風、路面等；賽道難度獨立記錄，不納入三項體驗評分。",
              "For example, hills, wind or road surface. Course difficulty is separate from the three experience scores.",
            )}
            value={active.courseNotes}
            lang={english && /\p{Script=Han}/u.test(active.courseNotes) ? "zh-HK" : undefined}
            onChange={(e) => update({ courseNotes: e.target.value })}
          />
        </label>
      </fieldset>
      <div className="notebook-actions">
        <button type="button" onClick={save} disabled={!ready || storageBlocked}>
          {t("儲存此裝置草稿", "Save draft on this device")}
        </button>
        <button type="button" onClick={download} disabled={!ready}>
          {t("匯出筆記備份", "Export notes backup")}
        </button>
        <button type="button" onClick={requestConfirmation} disabled={!ready}>
          {t("匯出待確認筆記", "Export notes for review")}
        </button>
        <button type="button" onClick={() => importInput.current?.click()} disabled={!ready}>
          {t("匯入筆記備份", "Import notes backup")}
        </button>
        <input
          ref={importInput}
          type="file"
          accept="application/json,.json"
          hidden
          disabled={!ready}
          onChange={(e) => void importFile(e.target.files?.[0])}
        />
      </div>
      <p role="status" aria-live="polite">
        {message ? englishRaceTerm(message, english) : t("未有修改。", "No changes yet.")}
      </p>
      <p>
        {t(
          "筆記可以先保留零散觀察。正式發布前，會整理成每項短評、優點／問題、適合對象及依據，並核對年份、組別與評審署名。",
          "Start with individual observations. Before publication, the review will describe strengths, issues, who it suited and supporting evidence, and confirm the year, category and reviewer.",
        )}
      </p>
    </div>
  );
}
