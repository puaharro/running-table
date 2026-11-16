import { language } from "./english-races";
import type { RegistrationChannel } from "./types";

export function channelPriceLabel(channel: RegistrationChannel, english = false) {
  const t = language(english);
  return channel.price === null
    ? t("待核實", "Unverified")
    : channel.price === 0
      ? t("免費", "Free")
      : `${channel.currency === "HKD" ? "HK$" : "US$"} ${channel.price.toLocaleString("en-HK")}`;
}
export function channelPriceHeading(channel: RegistrationChannel, english = false) {
  const t = language(english);
  return channel.priceType === "minimum-donation"
    ? t("最低籌款額", "Minimum fundraising amount")
    : channel.priceType === "package"
      ? t("套票價格", "Package price")
      : t("參賽費用", "Entry fee");
}
