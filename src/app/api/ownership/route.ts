import { NextResponse } from "next/server";
import { toggleManuel } from "@/lib/ownership";

function lireCorps(body: unknown): { cardId: string; variante: "n" | "r" | "h" } | null {
  if (!body || typeof body !== "object") return null;
  const { cardId, variante } = body as Record<string, unknown>;
  if (typeof cardId !== "string" || !cardId) return null;
  if (variante !== "n" && variante !== "r" && variante !== "h") return null;
  return { cardId, variante };
}

export async function POST(request: Request) {
  const corps = lireCorps(await request.json().catch(() => null));
  if (!corps) return NextResponse.json({ error: "Corps invalide" }, { status: 400 });
  await toggleManuel(corps.cardId, corps.variante, true);
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const corps = lireCorps(await request.json().catch(() => null));
  if (!corps) return NextResponse.json({ error: "Corps invalide" }, { status: 400 });
  await toggleManuel(corps.cardId, corps.variante, false);
  return NextResponse.json({ ok: true });
}
