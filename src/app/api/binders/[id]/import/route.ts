import { NextResponse } from "next/server";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { nanoid } from "nanoid";
import { prisma } from "@/lib/prisma";
import { getBinder, saveBinder } from "@/lib/binders";
import type { Case, ExportPayload } from "@/lib/types";

export const dynamic = "force-dynamic";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const existing = await getBinder(params.id);
  if (!existing) return NextResponse.json({ error: "Classeur introuvable" }, { status: 404 });

  const body = (await request.json().catch(() => null)) as ExportPayload | null;
  if (!body || body.version !== 3 || ![2, 3, 4].includes(body.format) || !Array.isArray(body.cases)) {
    return NextResponse.json(
      { error: "Fichier illisible ou export d'une ancienne version incompatible. Choisis un export produit par ce classeur." },
      { status: 400 }
    );
  }

  await mkdir(UPLOAD_DIR, { recursive: true });

  // Les images importées reçoivent un nouvel identifiant pour ne jamais
  // entrer en collision avec la bibliothèque déjà présente sur ce serveur.
  const idMap = new Map<string, string>();
  for (const im of body.images ?? []) {
    try {
      const id = nanoid();
      const buffer = Buffer.from(im.data, "base64");
      const ext = im.type?.split("/")[1] ? `.${im.type.split("/")[1]}` : "";
      const filename = `${id}${ext}`;
      await writeFile(path.join(UPLOAD_DIR, filename), buffer);
      await prisma.visual.create({
        data: { id, nom: im.nom || "image", path: `/uploads/${filename}`, mimeType: im.type || "image/png" },
      });
      idMap.set(im.id, id);
    } catch {
      // image corrompue dans le fichier importé : on l'ignore, les cases qui
      // la référencent seront vidées ci-dessous.
    }
  }

  const cases: Case[] = body.cases.map((c) => {
    if (c && c.t === "i") {
      const nouvelId = idMap.get(c.a);
      return nouvelId ? { ...c, a: nouvelId } : null;
    }
    return c;
  });

  // La possession (CollectionEntry) est globale et n'est plus réécrite ici :
  // `body.possede` (présent pour compatibilité du format d'export) est ignoré.
  await saveBinder(params.id, { format: body.format, cases });

  return NextResponse.json({ ok: true });
}
