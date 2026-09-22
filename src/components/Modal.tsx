"use client";

import { useEffect, useRef } from "react";

export default function Modal({
  open,
  onRequestClose,
  className,
  children,
}: {
  open: boolean;
  onRequestClose: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    const surFermeture = () => onRequestClose();
    d.addEventListener("close", surFermeture);
    return () => d.removeEventListener("close", surFermeture);
  }, [onRequestClose]);

  return (
    <dialog ref={ref} className={className}>
      {open ? children : null}
    </dialog>
  );
}
