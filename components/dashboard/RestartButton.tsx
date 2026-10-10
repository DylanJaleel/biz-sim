"use client";

import { useTransition } from "react";
import { restartGameAction } from "@/app/(app)/actions";

export function RestartButton({ label = "Neues Spiel starten" }: { label?: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => restartGameAction())}
      className="h-12 w-full rounded-xl bg-blue-600 text-base font-semibold text-white active:bg-blue-700 disabled:opacity-60"
    >
      {pending ? "Wird zurückgesetzt…" : label}
    </button>
  );
}
