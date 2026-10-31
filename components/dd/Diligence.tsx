import { notFound } from "next/navigation";
import { currentGame } from "@/lib/current-game";
import { definitionIn } from "@/lib/game/engine";
import { diligenceView } from "@/lib/game/diligence";
import { DiligenceTable } from "./DiligenceTable";

// Seite der Due Diligence mit der CFO (/pruefung/[id]): Startup-Angebote und Übernahmeziele.

export async function Diligence({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { state, revision } = await currentGame();
  const s = state.startups.find((x) => x.id === id && x.status === "offered" && x.offer);
  if (!s) notFound();
  const facts = s.offer?.ev ? [] : (definitionIn(state, s.id).diligence ?? []);
  const v = diligenceView(state, s, facts);
  const back = v.kind === "deal" ? { href: `/uebernahme/${s.id}`, label: "Zur Übernahme" } : { href: `/post?firma=${s.id}`, label: "Zum Angebot" };
  return (
    <div className="page page--wide ddc-page">
      <DiligenceTable key={`${v.findings.length}-${v.done}`} v={v} revision={revision} back={back} />
    </div>
  );
}
