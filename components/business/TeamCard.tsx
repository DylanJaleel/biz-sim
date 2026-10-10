"use client";

import { useState, useTransition } from "react";
import { fireEmployeeAction } from "@/app/(app)/actions";
import { Card } from "@/components/ui/Card";
import { EMPLOYEE_NOTICE_WEEKS } from "@/lib/config";
import { formatHours } from "@/lib/format";
import type { TeamMember } from "@/lib/repository/company";

function describe(member: TeamMember): string {
  if (member.status === "starting") return `Startet in Woche ${member.startsWeek}`;
  const notes: string[] = [formatHours(member.hours)];
  if (member.onboarding) notes.push("Einarbeitung");
  if (member.sick) notes.push("krank");
  if (!member.hasVehicle) notes.push("ohne Fahrzeug");
  if (member.status === "notice") notes.push(`geht nach Woche ${(member.endsWeek ?? 1) - 1}`);
  return notes.join(" · ");
}

function MemberRow({ member }: { member: TeamMember }) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const canFire = member.id !== null && member.status !== "notice";

  function fire() {
    if (!member.id) return;
    const id = member.id;
    setError(null);
    startTransition(async () => {
      const result = await fireEmployeeAction(id);
      setConfirming(false);
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <li className="py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="font-medium text-zinc-900 dark:text-zinc-50">{member.name}</div>
          <div className="text-xs text-zinc-500 dark:text-zinc-400">{describe(member)}</div>
        </div>
        {canFire && !confirming && (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="h-11 shrink-0 rounded-xl px-3 text-sm font-medium text-red-600 active:bg-red-50 dark:text-red-400 dark:active:bg-red-500/10"
          >
            {member.status === "starting" ? "Absagen" : "Kündigen"}
          </button>
        )}
      </div>
      {confirming && (
        <div className="mt-2">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {member.status === "starting"
              ? "Die Vermittlungsgebühr ist weg."
              : `Es gilt eine Kündigungsfrist von ${EMPLOYEE_NOTICE_WEEKS} Wochen – der Lohn läuft weiter.`}
          </p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => setConfirming(false)}
              className="h-11 rounded-xl border border-black/15 text-sm font-medium text-zinc-700 dark:border-white/15 dark:text-zinc-200"
            >
              Abbrechen
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={fire}
              className="h-11 rounded-xl bg-red-600 text-sm font-semibold text-white active:bg-red-700 disabled:opacity-60"
            >
              {pending ? "…" : "Bestätigen"}
            </button>
          </div>
        </div>
      )}
      {error && (
        <p role="alert" className="mt-2 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </li>
  );
}

export function TeamCard({ team, seats }: { team: TeamMember[]; seats: number }) {
  return (
    <Card title={`Team · ${team.length}/${seats} Plätze`}>
      <ul className="divide-y divide-black/10 dark:divide-white/10">
        {team.map((member) => (
          <MemberRow key={member.id ?? "owner"} member={member} />
        ))}
      </ul>
    </Card>
  );
}
