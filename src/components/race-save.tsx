"use client";
import { englishDate, englishTimestamp, language, localPath } from "@/lib/english-races";
import { RaceShare } from "./race-share";
import { useEffect, useState } from "react";
import { favoritesKey, parseFavorites, toggleFavorite } from "@/lib/favorites";
import { calendarFile, calendarItems } from "@/lib/calendar";
import { raceHref } from "@/lib/site";
import { displayDate, formatTimestamp } from "@/lib/races";
import type { Race } from "@/lib/types";
import { favoriteResultsHref } from "@/lib/results-location";
import { Icon } from "./ui";
const changed = "nxtgo:favorites-change";
export function useFavorites() {
  const [ids, setIds] = useState<string[]>([]),
    [ready, setReady] = useState(false),
    [message, setMessage] = useState("");
  useEffect(() => {
    function refresh() {
      try {
        setIds(parseFavorites(localStorage.getItem(favoritesKey)));
        setReady(true);
      } catch {
        setReady(false);
        setMessage("無法讀取本機收藏；請檢查瀏覽器儲存設定。");
      }
    }
    const sync = (event: StorageEvent) => {
      if (event.key === favoritesKey || event.key === null) refresh();
    };
    refresh();
    window.addEventListener(changed, refresh);
    window.addEventListener("storage", sync);
    window.addEventListener("pageshow", refresh);
    return () => {
      window.removeEventListener(changed, refresh);
      window.removeEventListener("storage", sync);
      window.removeEventListener("pageshow", refresh);
    };
  }, []);
  function toggle(id: string, saved?: boolean) {
    try {
      const next = toggleFavorite(localStorage, id, saved);
      setIds(next);
      setMessage(next.includes(id) ? "已收藏於此瀏覽器。" : "已取消收藏。");
      window.dispatchEvent(new Event(changed));
      return next.includes(id);
    } catch {
      setMessage("未能儲存收藏；請檢查瀏覽器儲存設定。原有收藏未被覆寫。");
      return null;
    }
  }
  return { ids, ready, message, toggle };
}
export function FavoriteFeedback({
  saved,
  message,
  english = false,
}: {
  saved: boolean;
  message: string;
  english?: boolean;
}) {
  const confirmed = saved && message === "已收藏於此瀏覽器。";
  const error = message.startsWith("未能") || message.startsWith("無法");
  return (
    <span
      className={confirmed ? "favorite-notice" : error ? "favorite-error" : "sr-only"}
      role="status"
    >
      {confirmed ? (
        <a href={localPath(favoriteResultsHref, english)}>
          {english ? "View saved races" : "查看收藏"}
        </a>
      ) : (
        message
      )}
    </span>
  );
}
export function FavoriteButton({
  race,
  onRemove,
  compact = false,
  english = false,
}: {
  race: Pick<Race, "id" | "name">;
  onRemove?: (keyboard: boolean) => void;
  compact?: boolean;
  english?: boolean;
}) {
  const { ids, ready, message, toggle } = useFavorites();
  const saved = ids.includes(race.id);
  return (
    <span className="favorite-control">
      <button
        type="button"
        className="button"
        disabled={!ready}
        aria-pressed={saved}
        aria-label={
          english
            ? `${saved ? "Remove saved race" : "Save race"}: ${race.name}`
            : `${saved ? "取消收藏" : "收藏"}：${race.name}`
        }
        onClick={(event) => {
          if (toggle(race.id) === false) onRemove?.(event.detail === 0);
        }}
      >
        <span
          className="favorite-icon"
          aria-hidden="true"
          data-confirmed={saved && message === "已收藏於此瀏覽器。"}
        >
          <Icon name="star" size={19} />
        </span>{" "}
        {!compact && (english ? (saved ? "Saved" : "Save") : saved ? "已收藏" : "收藏")}
      </button>
      {compact ? (
        <span
          className={
            message.startsWith("未能") || message.startsWith("無法") ? "favorite-error" : "sr-only"
          }
          role="status"
        >
          {message}
        </span>
      ) : (
        <FavoriteFeedback english={english} saved={saved} message={message} />
      )}
    </span>
  );
}
export function RaceSaveActions({
  race,
  initialNow,
  english = false,
}: {
  race: Race;
  initialNow: string;
  english?: boolean;
}) {
  const t = language(english);
  const [now, setNow] = useState(initialNow),
    [selected, setSelected] = useState(""),
    [message, setMessage] = useState("");
  useEffect(() => {
    const tick = () => setNow(new Date().toISOString());
    tick();
    const id = window.setInterval(tick, 60000);
    return () => window.clearInterval(id);
  }, []);
  const items = calendarItems(race, now, english),
    item = items.find((i) => i.id === selected) ?? items[0];
  function download() {
    if (!item) return;
    try {
      const fresh = calendarItems(race, new Date().toISOString(), english).find(
        (i) => i.id === item.id,
      );
      if (!fresh) {
        setMessage(
          t(
            "日期已過或資料未符合匯出條件，請重新選擇。",
            "This date can no longer be exported. Choose another date.",
          ),
        );
        return;
      }
      const text = calendarFile(
        fresh,
        new URL(localPath(raceHref(race), english), window.location.origin).href,
        new Date().toISOString(),
        english,
      );
      const url = URL.createObjectURL(new Blob([text], { type: "text/calendar;charset=utf-8" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `nxtgo-${fresh.id.replace(/[^a-z0-9-]/gi, "-")}.ics`;
      a.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 60000);
      setMessage(
        t(
          "已準備日曆檔；請開啟檔案並確認匯入。未自動新增至日曆。",
          "Open the downloaded calendar file to confirm the import.",
        ),
      );
    } catch {
      setMessage(
        t("未能產生日曆檔，請稍後再試。", "Could not generate the calendar file. Try again."),
      );
    }
  }
  return (
    <div className="race-save-actions">
      <FavoriteButton
        english={english}
        race={english ? { id: race.id, name: race.englishName } : race}
      />
      <RaceShare
        english={english}
        name={english ? race.englishName : race.name}
        href={localPath(raceHref(race), english)}
      />
      <details>
        <summary>{t("加入日曆", "Add to calendar")}</summary>
        <div className="calendar-download">
          <label>
            {t("選擇日期", "Choose a date")}
            <select
              value={item?.id ?? ""}
              onChange={(e) => setSelected(e.target.value)}
              disabled={!items.length}
            >
              {items.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.label}
                </option>
              ))}
            </select>
          </label>
          {item && (
            <p>
              <strong>
                {english
                  ? item.timed
                    ? englishTimestamp(item.date)
                    : englishDate(item.date)
                  : item.timed
                    ? `${formatTimestamp(item.date)} 香港時間`
                    : `${displayDate(item.date, { year: "numeric", month: "long", day: "numeric" })}（全日${item.id.endsWith(":deadline") ? "；截止時刻待核實" : ""}）`}
              </strong>
            </p>
          )}
          <button type="button" className="button" disabled={!item} onClick={download}>
            {t("下載日曆檔", "Download calendar file")}
          </button>
          <p>
            {t(
              "比賽日以全日行程列出。日曆只提供有來源支持且尚未過期的報名截止日期，未列出的期限仍待核實。",
              "Race days appear as all-day events. Only verified future entry deadlines are included.",
            )}
          </p>
          <p>
            {t(
              "下載後需自行匯入；賽期或截止日期如有變更，日曆不會自動同步。",
              "Import the downloaded file yourself. Changes to race dates or deadlines do not sync automatically.",
            )}
          </p>
          <p role="status">
            {items.length ? message : t("暫無可加入的日期。", "No dates are available to add.")}
          </p>
        </div>
      </details>
      <small>
        {t(
          "收藏只存於此瀏覽器，清除網站資料後會移除，不會跨裝置同步。",
          "Saved races stay in this browser. Clearing site data removes them.",
        )}
      </small>
    </div>
  );
}
