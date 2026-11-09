export type NoteRevision = {
  revision: number;
  at: string;
  differences: string;
  verification: string;
  basis: string;
};
export type LocalNote = { context: string; history: NoteRevision[] };
export const noteStorageKey = (context: string) => `nxtgo:comparison-note:v1:${context}`;
export function parseLocalNote(raw: string | null, context: string): LocalNote {
  if (raw === null) return { context, history: [] };
  const note = JSON.parse(raw) as LocalNote;
  if (
    !note ||
    note.context !== context ||
    !Array.isArray(note.history) ||
    note.history.some(
      (item, index) =>
        item.revision !== index + 1 ||
        typeof item.at !== "string" ||
        !Number.isFinite(Date.parse(item.at)) ||
        typeof item.differences !== "string" ||
        item.differences.length > 2000 ||
        typeof item.verification !== "string" ||
        item.verification.length > 2000 ||
        typeof item.basis !== "string",
    )
  )
    throw new Error("備註資料無法讀取，未有覆寫。請先匯出備份或使用原有瀏覽器查看。");
  return note;
}
export function saveLocalNote(
  storage: Pick<Storage, "getItem" | "setItem">,
  context: string,
  expected: number,
  values: Pick<NoteRevision, "differences" | "verification" | "basis">,
  at = new Date().toISOString(),
) {
  const key = noteStorageKey(context);
  const note = parseLocalNote(storage.getItem(key), context);
  if (note.history.length !== expected)
    throw new Error("另一個視窗已修改備註。請保留輸入文字，重新載入已儲存版本後再修改。");
  const next: LocalNote = {
    context,
    history: [...note.history, { ...values, revision: expected + 1, at }],
  };
  const serialized = JSON.stringify(next);
  parseLocalNote(serialized, context);
  storage.setItem(key, serialized);
  return next;
}
