import Link from "next/link";
import type { NextStepView } from "@/lib/game/views";
import { ActionButton } from "@/components/game/ActionButton";

/** The next career step: what is missing, how far you are, and the button once it's all there. */
export function NextStepCard({ step, revision }: { step: NextStepView; revision: number }) {
  const done = step.requirements.filter((r) => r.done).length;
  return (
    <div className="nextstep" aria-labelledby="nextstep-title">
      <div className="nextstep__head">
        <span className="glbl">
          Nächster Schritt · {done} von {step.requirements.length} erfüllt
        </span>
        <b id="nextstep-title">{step.title}</b>
        <span className="nextstep__text">{step.text}</span>
      </div>
      <ul className="nextstep__reqs">
        {step.requirements.map((r) => (
          <li key={r.label} className={r.done ? "is-done" : undefined}>
            <span aria-hidden="true">{r.done ? "✓" : "○"}</span>
            <span>
              {r.label}
              <span className="sr-only">{r.done ? " (erfüllt)" : " (fehlt noch)"}</span>
            </span>
          </li>
        ))}
      </ul>
      <div className="nextstep__actions">
        {step.action && (
          <ActionButton action={step.action.move} revision={revision} days={step.action.days} size="sm" variant="primary">
            {step.action.label}
          </ActionButton>
        )}
        {step.side && (
          <ActionButton action={step.side.move} revision={revision} size="sm" disabled={!step.side.ready}>
            {step.side.label}
          </ActionButton>
        )}
        {step.link && (
          <Link href={step.link.href} className="btn btn--sm">
            {step.link.label}
          </Link>
        )}
      </div>
      {step.side && <span className="glbl">Auf dem Weg: {step.side.text}</span>}
    </div>
  );
}
