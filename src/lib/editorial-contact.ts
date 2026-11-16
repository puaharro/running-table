import { language } from "./english-races";
import { englishRaceTerm } from "./race-terms.en";

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
  english = false,
) {
  const t = language(english);
  const email = (v: string) => /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(v);
  if (!email(recipient))
    throw new Error(
      t(
        "暫未設定有效收件電郵，未能準備寄出。",
        "A valid recipient address is required to prepare the email.",
      ),
    );
  if (
    !Object.hasOwn(feedbackTypes, input.type) ||
    !input.raceName.trim() ||
    !input.group.trim() ||
    !/^20\d{2}$/.test(input.year) ||
    !input.quotedText.trim() ||
    !input.details.trim()
  )
    throw new Error(
      t(
        "請填妥賽事、年份、組別、爭議內容及原因。",
        "Enter the race, year, category, disputed wording or score, and reason.",
      ),
    );
  if (input.replyEmail.trim() && !email(input.replyEmail.trim()))
    throw new Error(
      t("請提供有效回覆電郵，或留空。", "Enter a valid reply email or leave it blank."),
    );
  if (input.evidenceUrl.trim()) {
    const source = new URL(input.evidenceUrl.trim());
    if (source.protocol !== "https:" || source.username || source.password)
      throw new Error(
        t(
          "佐證連結請使用 HTTPS，亦可留空並在電郵加入附件。",
          "Use an HTTPS evidence link or leave it blank and attach the evidence to your email.",
        ),
      );
  }
  const type = englishRaceTerm(feedbackTypes[input.type], english);
  const subject = english
    ? `${type}: ${input.raceName} ${input.year} ${input.group}`
    : `${feedbackTypes[input.type]}：${input.raceName} ${input.year} ${input.group}`;
  const body = english
    ? `Type: ${type}\nRace: ${input.raceName}\nEdition / category: ${input.year} / ${input.group}\nReview reference: ${input.reviewId.trim() || "Not provided"}\n\nDisputed wording or score:\n${input.quotedText.trim()}\n\nReason and requested correction or response:\n${input.details.trim()}\n\nEvidence: ${input.evidenceUrl.trim() || "Not provided. You may attach evidence."}\nReply email: ${input.replyEmail.trim() || "Reply to the sender"}\n\nThis website prepared the draft. Review it before sending.`
    : `類別：${feedbackTypes[input.type]}\n賽事：${input.raceName}\n年份／組別：${input.year}／${input.group}\n評論參考：${input.reviewId.trim() || "未提供"}\n\n爭議句子／分數：\n${input.quotedText.trim()}\n\n原因／希望更正或回應的內容：\n${input.details.trim()}\n\n佐證連結：${input.evidenceUrl.trim() || "未提供，可自行附上材料"}\n回覆電郵：${input.replyEmail.trim() || "請使用寄件電郵回覆"}\n\n此內容由網站協助準備，須由寄件者確認後自行寄出。`;
  return {
    recipient,
    subject,
    body,
    url: `mailto:${recipient}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`,
  };
}
