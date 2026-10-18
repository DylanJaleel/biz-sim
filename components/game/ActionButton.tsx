"use client";

import type { GameAction } from "@/lib/game/types";
import { usePlay } from "./usePlay";

interface ActionButtonProps {
  action: GameAction;
  revision: number;
  children: React.ReactNode;
  /** Days the action costs, shown on the button. */
  days?: number;
  variant?: "primary" | "ghost" | "danger";
  size?: "sm";
  disabled?: boolean;
}

/** A button that plays one move and shows the rule that blocked it, if any. */
export function ActionButton({ action, revision, children, days, variant, size, disabled }: ActionButtonProps) {
  const { play, pending, error } = usePlay(revision);
  const cls = ["btn"];
  if (variant) cls.push(`btn--${variant}`);
  if (size) cls.push(`btn--${size}`);
  return (
    <span className="action">
      <button type="button" className={cls.join(" ")} disabled={disabled || pending} onClick={() => play(action)} aria-busy={pending}>
        <span>{children}</span>
        {days !== undefined && <span className="btn__days">{days === 1 ? "1 Tag" : `${days} Tage`}</span>}
      </button>
      {error && (
        <span className="action__error" role="alert">
          {error}
        </span>
      )}
    </span>
  );
}
