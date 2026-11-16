"use client";

import { useId, useRef, type ReactNode } from "react";

export function RaceDialog({
  title,
  onOpen,
  children,
  english = false,
}: {
  title: string;
  onOpen?: () => void;
  children: ReactNode;
  english?: boolean;
}) {
  const id = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLButtonElement>(null);

  return (
    <>
      <button
        type="button"
        className="button"
        ref={opener}
        aria-haspopup="dialog"
        onClick={() => {
          onOpen?.();
          dialog.current?.showModal();
        }}
      >
        {title}
      </button>
      <dialog
        ref={dialog}
        className="nxtgo-dialog race-dialog"
        aria-labelledby={id}
        onClose={() => opener.current?.focus({ preventScroll: true })}
      >
        <div className="nxtgo-dialog-heading">
          <h2 id={id}>{title}</h2>
          <button type="button" className="button" onClick={() => dialog.current?.close()}>
            {english ? "Close" : "關閉"}
          </button>
        </div>
        {children}
      </dialog>
    </>
  );
}
