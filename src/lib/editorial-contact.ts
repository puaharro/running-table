// Public contact address supplied by the site owner for editorial feedback.
export const editorialContactEmail = "phonesaverltd@gmail.com";
export const feedbackTypes = {
  correction: "評級更正",
  complaint: "評級投訴",
  "organizer-response": "大會回應",
} as const;
export interface EditorialFeedback {
  type: keyof typeof feedbackTypes;
  raceName: string;
  group: string;
  year: string;
  reviewId: string;
  quotedText: string;
  details: string;
  evidenceUrl: string;
  replyEmail: string;
}
export function prepareEditorialFeedback(
  input: EditorialFeedback,
  recipient = editorialContactEmail,
) {
  const email = (v: string) => /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(v);
  if (!email(recipient)) throw new Error("暫未設定有效收件電郵，未能準備寄出。");
  if (
    !Object.hasOwn(feedbackTypes, input.type) ||
    !input.raceName.trim() ||
    !input.group.trim() ||
    !/^20\d{2}$/.test(input.year) ||
    !input.quotedText.trim() ||
    !input.details.trim()
  )
    throw new Error("請填妥賽事、年份、組別、爭議內容及原因。");
  if (input.replyEmail.trim() && !email(input.replyEmail.trim()))
    throw new Error("請提供有效回覆電郵，或留空。");
  if (input.evidenceUrl.trim()) {
    const source = new URL(input.evidenceUrl.trim());
    if (source.protocol !== "https:" || source.username || source.password)
      throw new Error("佐證連結請使用 HTTPS，亦可留空並在電郵加入附件。");
  }
  const subject = `${feedbackTypes[input.type]}：${input.raceName} ${input.year} ${input.group}`;
  const body = `類別：${feedbackTypes[input.type]}\n賽事：${input.raceName}\n年份／組別：${input.year}／${input.group}\n評論參考：${input.reviewId.trim() || "未提供"}\n\n爭議句子／分數：\n${input.quotedText.trim()}\n\n原因／希望更正或回應的內容：\n${input.details.trim()}\n\n佐證連結：${input.evidenceUrl.trim() || "未提供，可自行附上材料"}\n回覆電郵：${input.replyEmail.trim() || "請使用寄件電郵回覆"}\n\n此內容由網站協助準備，須由寄件者確認後自行寄出。`;
  return {
    recipient,
    subject,
    body,
    url: `mailto:${recipient}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`,
  };
}
