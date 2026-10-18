"use client";

import { useState } from "react";
import type { MonthReport } from "@/lib/game/types";
import { ReportDialog } from "@/components/shell/CloseMonth";

export function ReportButton({ report }: { report: MonthReport }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="btn btn--sm btn--ghost" onClick={() => setOpen(true)}>
        Bericht
      </button>
      {open && <ReportDialog report={report} onClose={() => setOpen(false)} />}
    </>
  );
}
