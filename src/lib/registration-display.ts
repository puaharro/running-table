import type { RegistrationChannel } from "./types";

export function channelPriceLabel(channel: RegistrationChannel) {
  return channel.price === null
    ? "待核實"
    : channel.price === 0
      ? "免費"
      : `${channel.currency === "HKD" ? "HK$" : "US$"} ${channel.price.toLocaleString("en-HK")}`;
}
export function channelPriceHeading(channel: RegistrationChannel) {
  return channel.priceType === "minimum-donation"
    ? "最低籌款額"
    : channel.priceType === "package"
      ? "套票價格"
      : "參賽費用";
}
