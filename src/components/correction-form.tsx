"use client";

import { language } from "@/lib/english-races";

import { useEffect, useState, type FormEvent } from "react";
import { correctionUrl } from "@/lib/corrections";
import { siteUrl } from "@/lib/site";

export function CorrectionForm({
  races,
  contactEmail,
  english = false,
}: {
  races: { id: string; name: string; path: string }[];
  contactEmail?: string;
  english?: boolean;
}) {
  const t = language(english);
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
        correctionUrl(
          {
            raceName: race.name,
            racePath: new URL(race.path, siteUrl || window.location.origin).href,
            details,
            sourceUrl,
            contactEmail,
          },
          english,
        ),
      );
      setError("");
    } catch {
      setError(
        t(
          "請提供有效的 HTTPS 官方公告連結。",
          "Enter a valid HTTPS link to the official announcement.",
        ),
      );
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
          ? t(
              "填妥後可開啟電郵程式，確認內容再寄出。我們會核實後更新紀錄。",
              "Open your email app, check the draft, then send it. We update the listing after verifying the correction.",
            )
          : t(
              "回報會透過 GitHub Issues 公開提交，需要登入 GitHub。請只填賽事資料，勿填電話或其他私人資料。",
              "This report is submitted publicly through GitHub Issues and requires signing in. Include only race information and omit phone numbers and other private data.",
            )}
      </p>
      <label>
        {t("賽事", "Race")}
        <select required value={raceId} onChange={(event) => setRaceId(event.target.value)}>
          <option value="">{t("請選擇賽事", "Select a race")}</option>
          {races.map((race) => (
            <option key={race.id} value={race.id}>
              {race.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        {t("需要更正的內容", "What needs correcting?")}
        <textarea
          required
          maxLength={1200}
          rows={5}
          value={details}
          onChange={(event) => setDetails(event.target.value)}
          placeholder={t(
            "例如：10K 組別的報名截止時間已更改，官方公告列明……",
            "For example: the organiser announced a new entry deadline for the 10K.",
          )}
        />
      </label>
      <label>
        {t("官方公告連結", "Official announcement URL")}
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
        {t("準備回報", "Prepare report")}
      </button>
      {error && <p role="alert">{error}</p>}
      {prepared && (
        <div role="status">
          <p>
            {t(
              "內容已準備，尚未提交。請開啟以下入口，確認內容再送出。",
              "Your draft is ready. Open the link below and review it before submitting.",
            )}
          </p>
          <a className="text-link" href={prepared} target="_blank" rel="noopener noreferrer">
            {contactEmail
              ? t("開啟電郵回報", "Open email draft")
              : t("前往 GitHub 提交（公開）", "Continue to GitHub (public)")}{" "}
            ↗
          </a>
        </div>
      )}
    </form>
  );
}
