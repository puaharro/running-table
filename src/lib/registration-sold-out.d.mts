import type { Race, RegistrationChannel, Source } from "./types";

export function registrationSoldOutSource(
  race: Race,
  channel: RegistrationChannel,
  now: number,
): Source | undefined;
