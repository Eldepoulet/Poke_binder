import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
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

  const images: ExportPayload["images"] = [];
  if (idsUtilises.size) {
    const visuels = await prisma.visual.findMany({ where: { id: { in: [...idsUtilises] }, userId } });
    for (const v of visuels) {
      try {
        const buffer = await readFile(path.join(process.cwd(), "public", v.path.replace(/^\//, "")));
        images.push({ id: v.id, nom: v.nom, type: v.mimeType, data: buffer.toString("base64") });
      } catch {
        // fichier disparu du disque : on exporte sans cette image, la case
        // restera simplement vide au ré-import.
      }
    }
  }

  const payload: ExportPayload = {
    binderId: binder.id,
    format,
    cases,
    possede,
    images,
    version: 3,
  };

  return NextResponse.json(payload);
}
