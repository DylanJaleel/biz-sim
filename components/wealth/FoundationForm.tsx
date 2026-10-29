"use client";

import { useState } from "react";
import type { FoundationPurpose } from "@/lib/game/wealth-types";
import { ActionButton } from "@/components/game/ActionButton";
import { eur } from "@/components/game/format";
import styles from "./wealth.module.css";

interface Props {
  mode: "found" | "give";
  amounts: number[];
  refund: Record<number, number>;
  purposes?: { id: FoundationPurpose; label: string }[];
  cash: number;
  cost: number;
  days: number;
  disabled: boolean;
  revision: number;
}

/** Errichten oder zustiften: Betrag (und Zweck) wählen, Steuererstattung sehen, unwiderruflich bestätigen. */
export function FoundationForm({ mode, amounts, refund, purposes, cash, cost, days, disabled, revision }: Props) {
  const [amount, setAmount] = useState(amounts[0]!);
  const [purpose, setPurpose] = useState<FoundationPurpose>(purposes?.[0]?.id ?? "bildung");
  const need = amount + (mode === "found" ? cost : 0);
  return (
    <div className={styles.form}>
      <label>
        Betrag
        <select value={amount} onChange={(e) => setAmount(Number(e.target.value))}>
          {amounts.map((a) => (
            <option key={a} value={a}>
              {eur(a)}
            </option>
          ))}
        </select>
      </label>
      {mode === "found" && purposes && (
        <label>
          Zweck
          <select value={purpose} onChange={(e) => setPurpose(e.target.value as FoundationPurpose)}>
            {purposes.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
      )}
      <ActionButton
        action={mode === "found" ? { type: "foundation", move: "found", amount, purpose } : { type: "foundation", move: "give", amount }}
        revision={revision}
        days={days}
        variant="primary"
        disabled={disabled || cash < need}
      >
        {mode === "found" ? "Unwiderruflich errichten" : "Unwiderruflich zustiften"}
      </ActionButton>
      <span className="muted small">
        Steuererstattung {eur(refund[amount] ?? 0)} · dein Vermögen sinkt um {eur(need - (refund[amount] ?? 0))}
        {cash < need ? ` · es fehlen ${eur(need - cash)} auf dem Konto` : ""}
      </span>
    </div>
  );
}
