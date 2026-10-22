import type { ReactNode } from "react";
import { registrationLabels, type RegistrationStatus } from "@/lib/types";

export function StatusBadge({
  status,
  children,
}: {
  status: RegistrationStatus;
  children?: ReactNode;
}) {
  return (
    <span className={`status-badge ${status}`}>
      <i aria-hidden="true" />
      {children ?? registrationLabels[status]}
    </span>
  );
}
