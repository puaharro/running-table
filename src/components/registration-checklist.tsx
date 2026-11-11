"use client";

import { useEffect, useState } from "react";

const storageKey = "nxtgo:registration-checklist";
const tasks = [
  { id: "eligibility", label: "核對當屆官方入口同組別資格" },
  { id: "deadline", label: "記低報名截止日同付款期限" },
  { id: "fees", label: "核對總收費同退款條款" },
  { id: "logistics", label: "核對選手包領取同集合安排" },
];

export function RegistrationChecklist() {
  const [checked, setChecked] = useState<string[]>([]);
  const [storageError, setStorageError] = useState(false);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(storageKey) ?? "[]");
      if (Array.isArray(stored)) {
        setChecked(tasks.filter(({ id }) => stored.includes(id)).map(({ id }) => id));
      }
    } catch {
      setStorageError(true);
    }
  }, []);

  function save(next: string[]) {
    setChecked(next);
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
  }

  return (
    <section className="guide-checklist" aria-labelledby="registration-checklist-title">
      <h2 id="registration-checklist-title">報名前核對清單</h2>
      <p role="status">
        已核對 {checked.length}／{tasks.length}
      </p>
      <progress aria-label="報名前核對進度" max={tasks.length} value={checked.length} />
      <ul role="list">
        {tasks.map(({ id, label }) => (
          <li key={id}>
            <label>
              <input
                type="checkbox"
                checked={checked.includes(id)}
                onChange={(event) =>
                  save(event.target.checked ? [...checked, id] : checked.filter((item) => item !== id))
                }
              />
              {label}
            </label>
          </li>
        ))}
      </ul>
      <button type="button" className="button" disabled={!checked.length} onClick={() => save([])}>
        重置清單
      </button>
      {storageError && <p role="status">未能讀寫本機進度，重新載入後可能未能保留。</p>}
    </section>
  );
}
