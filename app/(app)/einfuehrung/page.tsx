import type { Metadata } from "next";

export const metadata: Metadata = { title: "Einführung · Boardroom" };

/**
 * Nur ein Einstieg: Die Einführung (components/shell/Onboarding.tsx) erkennt diesen Pfad,
 * startet vorn und leitet ins Büro. Ohne Skript landet man auf einer leeren Seite mit der Kopfleiste.
 */
export default function IntroPage() {
  return (
    <div className="page page--narrow">
      <p className="muted">Die Einführung startet gleich.</p>
    </div>
  );
}
