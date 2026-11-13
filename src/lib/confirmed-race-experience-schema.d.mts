export const selectedExperiences: Record<
  string,
  {
    file: string;
    groupId: string;
    websiteId: string;
    hash: string;
  }
>;
export function assertConfirmedExperience(record: unknown, raceId: string): void;
