"use client";

import { useEffect, useState, type FormEvent } from "react";
import { correctionUrl } from "@/lib/corrections";

export function CorrectionForm({
  races,
  contactEmail,
}: {
  races: { id: string; name: string; path: string }[];
  contactEmail?: string;
}) {
  const [raceId, setRaceId] = useState("");
  const [details, setDetails] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [prepared, setPrepared] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    const selected = new URLSearchParams(window.location.search).get("race");
    if (races.some((race) => race.id === selected)) setRaceId(selected!);
  }, [races]);
  function prepare(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const race = races.find((candidate) => candidate.id === raceId);
    if (!race || !details.trim()) return;
    try {
      setPrepared(
        correctionUrl({
          raceName: race.name,
          racePath: race.path,
          details,
          sourceUrl,
          contactEmail,
        }),
      );
      setError("");
    } catch {
      setError("請提供有效的 HTTPS 官方公告連結。");
    }
  }
  return (
    <form
      className="correction-form"
      onSubmit={prepare}
      onChange={() => {
        setPrepared("");
        setError("");
      }}
    >
      <p>
        {contactEmail
          ? "填妥後可開啟電郵程式，確認內容再寄出。我們會核實後更新紀錄。"
          : "回報會透過 GitHub Issues 公開提交，需要登入 GitHub。請只填賽事資料，勿填電話或其他私人資料。"}
      </p>
      <label>
        賽事
        <select required value={raceId} onChange={(event) => setRaceId(event.target.value)}>
          <option value="">請選擇賽事</option>
          {races.map((race) => (
            <option key={race.id} value={race.id}>
              {race.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        需要更正的內容
        <textarea
          required
          maxLength={1200}
          rows={5}
          value={details}
          onChange={(event) => setDetails(event.target.value)}
          placeholder="例如：10K 組別的報名截止時間已更改，官方公告列明……"
        />
      </label>
      <label>
        官方公告連結
        <input
          required
          type="url"
          maxLength={500}
          pattern="https://.*"
          value={sourceUrl}
          onChange={(event) => setSourceUrl(event.target.value)}
          placeholder="https://"
        />
      </label>
      <button className="button button-dark" type="submit">
        準備回報
      </button>
      {error && <p role="alert">{error}</p>}
      {prepared && (
        <div role="status">
          <p>內容已準備，尚未提交。請開啟以下入口，確認內容再送出。</p>
          <a className="text-link" href={prepared} target="_blank" rel="noopener noreferrer">
            {contactEmail ? "開啟電郵回報" : "前往 GitHub 提交（公開）"} ↗
          </a>
        </div>
      )}
    </form>
  );
}
