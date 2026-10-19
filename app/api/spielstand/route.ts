import { connection } from "next/server";
import { auth } from "@/auth";
import { exportGame } from "@/lib/repository/saves";

/** Downloads the running game as a signed file. */
export async function GET() {
  await connection();
  const session = await auth();
  if (!session?.user?.id) return new Response("Nicht angemeldet.", { status: 401 });
  const file = await exportGame(session.user.id);
  const name = `boardroom-${file.summary.monthLabel.replace(/[^\w]+/g, "-").toLowerCase()}.json`;
  return new Response(JSON.stringify(file), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${name}"`,
      "Cache-Control": "no-store",
    },
  });
}
