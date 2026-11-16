import { englishStatus } from "@/lib/english-races";
import type { ReactNode } from "react";
import { registrationLabels, type RegistrationStatus } from "@/lib/types";

export function StatusBadge({
  status,
  english = false,
  children,
}: {
  status: RegistrationStatus;
  english?: boolean;
  children?: ReactNode;
}) {
  return (
    <span className={`status-badge ${status}`}>
      <i aria-hidden="true" />
      {children ?? (english ? englishStatus[status] : registrationLabels[status])}
    </span>
  );
}
