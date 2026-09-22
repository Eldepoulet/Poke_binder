import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Carte } from "@/lib/types";

export const dynamic = "force-dynamic";

function versCarte(c: {
  id: string;
  set: string;
  numero: string;
  nom: string;
  rarete: string | null;
  categorie: string | null;
  illustrateur: string | null;
  hp: number | null;
  varNormal: boolean;
  varReverse: boolean;
  varHolo: boolean;
  varReversePokeball: boolean;
  varReverseMasterball: boolean;
  imageLocal: string | null;
  imageUrl: string | null;
  imageLow: string | null;
}): Carte {
  return { ...c };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const set = searchParams.get("set");
  const idsParam = searchParams.get("ids");

  if (idsParam) {
    const ids = idsParam.split(",").map((s) => s.trim()).filter(Boolean);
    if (!ids.length) return NextResponse.json([]);
    const cards = await prisma.card.findMany({ where: { id: { in: ids } } });
    return NextResponse.json(cards.map(versCarte) satisfies Carte[]);
  }

  if (!set) {
    return NextResponse.json(
      { error: "Paramètre 'set' ou 'ids' requis (le catalogue complet ne peut plus être chargé d'un coup)." },
      { status: 400 }
    );
  }

  const cards = await prisma.card.findMany({ where: { set }, orderBy: { numero: "asc" } });
  return NextResponse.json(cards.map(versCarte) satisfies Carte[]);
}
