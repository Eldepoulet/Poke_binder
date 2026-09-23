import { NextResponse } from "next/server";
import { toggleManuel } from "@/lib/ownership";
import { getUserId } from "@/lib/current-user";

function lireCorps(body: unknown): { cardId: string; variante: "n" | "r" | "h" | "p" | "m" } | null {
  if (!body || typeof body !== "object") return null;
  const { cardId, variante } = body as Record<string, unknown>;
  if (typeof cardId !== "string" || !cardId) return null;
  if (variante !== "n" && variante !== "r" && variante !== "h" && variante !== "p" && variante !== "m") return null;
  return { cardId, variante };
}

export async function POST(request: Request) {
  const userId = await getUserId();
  const corps = lireCorps(await request.json().catch(() => null));
  if (!corps) return NextResponse.json({ error: "Corps invalide" }, { status: 400 });
  await toggleManuel(corps.cardId, corps.variante, true, userId);
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const userId = await getUserId();
  const corps = lireCorps(await request.json().catch(() => null));
  if (!corps) return NextResponse.json({ error: "Corps invalide" }, { status: 400 });
  await toggleManuel(corps.cardId, corps.variante, false, userId);
  return NextResponse.json({ ok: true });
}
