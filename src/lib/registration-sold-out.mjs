// A channel can stay full when an editor has linked the official sold-out notice.
export function registrationSoldOutSource(race, channel, now) {
  if (
    race.verification !== "verified" ||
    channel.status !== "full" ||
    !channel.soldOutSourceId ||
    !channel.sourceIds?.includes(channel.soldOutSourceId)
  )
    return undefined;

  const verifiedAt = Date.parse(channel.registrationVerifiedAt);
  if (!(verifiedAt <= now)) return undefined;
  return race.sources?.find(
    (source) =>
      source.id === channel.soldOutSourceId &&
      source.fields?.includes("channels.registration") &&
      Date.parse(source.checkedAt) <= verifiedAt,
  );
}
