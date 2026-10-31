"use client";
import { useEffect, useState, type FormEvent } from "react";
import {
  feedbackTypes,
  prepareEditorialFeedback,
  type EditorialFeedback as Feedback,
} from "@/lib/editorial-contact";

export function EditorialFeedback({
  races,
  recipient,
}: {
  races: { id: string; name: string }[];
  recipient: string;
}) {
  const [raceId, setRaceId] = useState("");
  const [fields, setFields] = useState<Omit<Feedback, "raceName">>({
    type: "correction",
    group: "",
    year: "",
    reviewId: "",
    quotedText: "",
    details: "",
    evidenceUrl: "",
    replyEmail: "",
  });
  const [prepared, setPrepared] = useState<ReturnType<typeof prepareEditorialFeedback> | null>(
    null,
  );
  const [error, setError] = useState("");
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (races.some((r) => r.id === params.get("race"))) setRaceId(params.get("race")!);
    setFields((f) => ({
      ...f,
      reviewId: (params.get("review") ?? "").slice(0, 150),
      year: /^20\d{2}$/.test(params.get("year") ?? "") ? params.get("year")! : "",
      group: (params.get("group") ?? "").slice(0, 100),
    }));
  }, [races]);
  function field<K extends keyof typeof fields>(key: K, value: (typeof fields)[K]) {
    setFields((f) => ({ ...f, [key]: value }));
    setPrepared(null);
    setError("");
  }
  function prepare(event: FormEvent) {
    event.preventDefault();
    setPrepared(null);
    try {
      setPrepared(
        prepareEditorialFeedback(
          { ...fields, raceName: races.find((r) => r.id === raceId)?.name ?? "" },
          recipient,
        ),
      );
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "請檢查輸入內容。");
    }
  }
  return (
    <form className="correction-form editorial-feedback" onSubmit={prepare}>
      <p>
        此表格只準備電郵草稿，唔會上傳或儲存投訴。請確認內容後，自行寄到{" "}
        <a href={`mailto:${recipient}`}>{recipient}</a>；附件可在電郵加入。
      </p>
      <label>
        回報類別
        <select
          value={fields.type}
          onChange={(e) => field("type", e.target.value as Feedback["type"])}
        >
          {Object.entries(feedbackTypes).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label>
        賽事系列
        <select
          required
          value={raceId}
          onChange={(e) => {
            setRaceId(e.target.value);
            setPrepared(null);
          }}
        >
          <option value="">請選擇賽事</option>
          {races.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        所指參賽年份
        <input
          required
          inputMode="numeric"
          pattern="20[0-9]{2}"
          maxLength={4}
          value={fields.year}
          onChange={(e) => field("year", e.target.value)}
          placeholder="例如 2025；往屆請填實際年份"
        />
      </label>
      <label>
        組別
        <input
          required
          maxLength={100}
          value={fields.group}
          onChange={(e) => field("group", e.target.value)}
          placeholder="例如半馬、全馬或起跑批次"
        />
      </label>
      <label>
        評論參考（選填）
        <input
          maxLength={150}
          value={fields.reviewId}
          onChange={(e) => field("reviewId", e.target.value)}
        />
      </label>
      <label>
        爭議句子／分數
        <textarea
          required
          maxLength={1200}
          rows={3}
          value={fields.quotedText}
          onChange={(e) => field("quotedText", e.target.value)}
        />
      </label>
      <label>
        原因／希望更正或回應的內容
        <textarea
          required
          maxLength={2000}
          rows={5}
          value={fields.details}
          onChange={(e) => field("details", e.target.value)}
        />
      </label>
      <label>
        佐證連結（選填，毋須為官方公告）
        <input
          type="url"
          pattern="https://.*"
          maxLength={500}
          value={fields.evidenceUrl}
          onChange={(e) => field("evidenceUrl", e.target.value)}
          placeholder="https://"
        />
      </label>
      <label>
        回覆電郵（選填）
        <input
          type="email"
          maxLength={200}
          value={fields.replyEmail}
          onChange={(e) => field("replyEmail", e.target.value)}
        />
      </label>
      <p>
        請只提供處理所需資料，避免加入身份證、健康資料或無關人士個人資料；回報唔會轉到公開 GitHub。
      </p>
      <button type="submit" className="button button-dark">
        準備私人電郵
      </button>
      {error && <p role="alert">{error}</p>}
      {prepared && (
        <div className="prepared-feedback" role="status">
          <h3>電郵草稿已準備，尚未寄出</h3>
          <p>網站尚未收到此回報。請自行開啟電郵程式、確認收件人及內容，再按寄出。</p>
          <a className="text-link" href={prepared.url}>
            開啟電郵草稿 →
          </a>
          <label>
            電郵內容（可複製）
            <textarea readOnly rows={12} value={`${prepared.subject}\n\n${prepared.body}`} />
          </label>
          <p>如電郵程式未帶齊內容，可複製以上文字，自行寄到 {prepared.recipient}。</p>
        </div>
      )}
    </form>
  );
}
