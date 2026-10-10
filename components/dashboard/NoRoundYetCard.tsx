import { Card } from "@/components/ui/Card";

export function NoRoundYetCard() {
  return (
    <Card title="Wochenbilanz">
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        Noch keine Runde abgeschlossen. Die Wochenbilanz erscheint hier, sobald die erste Runde
        ausgewertet wurde.
      </p>
    </Card>
  );
}
