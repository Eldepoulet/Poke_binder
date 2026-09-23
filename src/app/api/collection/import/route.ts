import { NextResponse } from "next/server";
import { importPokecardexCsv } from "@/lib/pokecardexImport";
import { getUserId } from "@/lib/current-user";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const userId = await getUserId();
  const body = await request.json().catch(() => null);
  const csv = body && typeof body === "object" ? (body as Record<string, unknown>).csv : null;
  if (typeof csv !== "string" || !csv.trim()) {
    return NextResponse.json({ error: "Fichier CSV vide ou illisible" }, { status: 400 });
  }
  const resume = await importPokecardexCsv(csv, userId);
  return NextResponse.json(resume);
}
