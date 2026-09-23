import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getBinder } from "@/lib/binders";
import { getUserId } from "@/lib/current-user";
import type { Case, ExportPayload } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const userId = await getUserId();
  const binder = await getBinder(params.id, userId);
  if (!binder) return NextResponse.json({ error: "Classeur introuvable" }, { status: 404 });

  const { format, cases, possede } = binder;

  const idsUtilises = new Set(
    cases.filter((c): c is Extract<Case, { t: "i" }> => !!c && c.t === "i").map((c) => c.a)
  );

  // On n'exporte plus les images en base64 : le fichier ne porte que leur URL
  // publique, ce qui garde la réponse à quelques Ko même pour un classeur
  // rempli de visuels (cf. ExportPayload, version 4).
  const images: ExportPayload["images"] = [];
  if (idsUtilises.size) {
    const visuels = await prisma.visual.findMany({ where: { id: { in: [...idsUtilises] }, userId } });
    for (const v of visuels) {
      images.push({ id: v.id, nom: v.nom, type: v.mimeType, url: v.path });
    }
  }

  const payload: ExportPayload = {
    binderId: binder.id,
    format,
    cases,
    possede,
    images,
    version: 4,
  };

  return NextResponse.json(payload);
}
