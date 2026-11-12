"use client";
import { RaceShare } from "./race-share";
import { useEffect, useState } from "react";
import { favoritesKey, parseFavorites, toggleFavorite } from "@/lib/favorites";
import { calendarFile, calendarItems } from "@/lib/calendar";
import { raceHref } from "@/lib/site";
import { displayDate, formatTimestamp } from "@/lib/races";
import type { Race } from "@/lib/types";
import { favoriteResultsHref } from "@/lib/results-location";
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
export function FavoriteFeedback({ saved, message }: { saved: boolean; message: string }) {
  const confirmed = saved && message === "已收藏於此瀏覽器。";
  const error = message.startsWith("未能") || message.startsWith("無法");
  return (
    <span
      className={confirmed ? "favorite-notice" : error ? "favorite-error" : "sr-only"}
      role="status"
    >
      {confirmed ? <a href={favoriteResultsHref}>查看收藏</a> : message}
    </span>
  );
}
export function FavoriteButton({
  race,
  onRemove,
}: {
  race: Pick<Race, "id" | "name">;
  onRemove?: (keyboard: boolean) => void;
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
        aria-label={`${saved ? "取消收藏" : "收藏"}：${race.name}`}
        onClick={(event) => {
          if (toggle(race.id) === false) onRemove?.(event.detail === 0);
        }}
      >
        <span
          className="favorite-icon"
          aria-hidden="true"
          data-confirmed={saved && message === "已收藏於此瀏覽器。"}
        >
          {saved ? "★" : "☆"}
        </span>{" "}
        {saved ? "已收藏" : "收藏"}
      </button>
      <FavoriteFeedback saved={saved} message={message} />
    </span>
  );
}
export function RaceSaveActions({ race, initialNow }: { race: Race; initialNow: string }) {
  const [now, setNow] = useState(initialNow),
    [selected, setSelected] = useState(""),
    [message, setMessage] = useState("");
  useEffect(() => {
    const tick = () => setNow(new Date().toISOString());
    tick();
    const id = window.setInterval(tick, 60000);
    return () => window.clearInterval(id);
  }, []);
  const items = calendarItems(race, now),
    item = items.find((i) => i.id === selected) ?? items[0];
  function download() {
    if (!item) return;
    try {
      const fresh = calendarItems(race, new Date().toISOString()).find((i) => i.id === item.id);
      if (!fresh) {
        setMessage("日期已過或資料未符合匯出條件，請重新選擇。");
        return;
      }
      const text = calendarFile(
        fresh,
        new URL(raceHref(race), window.location.origin).href,
        new Date().toISOString(),
      );
      const url = URL.createObjectURL(new Blob([text], { type: "text/calendar;charset=utf-8" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `nxtgo-${fresh.id.replace(/[^a-z0-9-]/gi, "-")}.ics`;
      a.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 60000);
      setMessage("已準備日曆檔；請開啟檔案並確認匯入。未自動新增至日曆。");
    } catch {
      setMessage("未能產生日曆檔，請稍後再試。");
    }
  }
  return (
    <div className="race-save-actions">
      <FavoriteButton race={race} />
      <RaceShare name={race.name} href={raceHref(race)} />
      <details>
        <summary>加入日曆</summary>
        <div className="calendar-download">
          <label>
            選擇日期
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
                {item.timed
                  ? `${formatTimestamp(item.date)} 香港時間`
                  : `${displayDate(item.date, { year: "numeric", month: "long", day: "numeric" })}（全日${item.id.endsWith(":deadline") ? "；截止時刻待核實" : ""}）`}
              </strong>
            </p>
          )}
          <button type="button" className="button" disabled={!item} onClick={download}>
            下載日曆檔
          </button>
          <p>比賽日為全日行程；只提供有來源依據、尚未過期嘅報名截止。未列出嘅期限仍待核實。</p>
          <p>下載後需自行匯入；改期或截止日更新唔會自動同步。</p>
          <p role="status">{items.length ? message : "暫未有可加入嘅日期。"}</p>
        </div>
      </details>
      <small>收藏只存於此瀏覽器，清除網站資料後會移除，唔會跨裝置同步。</small>
    </div>
  );
}
