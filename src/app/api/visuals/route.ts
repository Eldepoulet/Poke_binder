import { NextResponse } from "next/server";
import path from "node:path";
import { put } from "@vercel/blob";
import { nanoid } from "nanoid";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/current-user";
import type { Visuel } from "@/lib/types";

export const dynamic = "force-dynamic";

const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif", "image/avif"]);
// Le corps d'une requête est plafonné à 4,5 Mo sur Vercel : au-delà, l'upload
// échouerait avant même d'atteindre ce code. Pour remonter cette limite il
// faudrait passer par un upload client direct (@vercel/blob/client).
const MAX_SIZE = 4 * 1024 * 1024; // 4 Mo par image

function extensionPour(mime: string): string {
  return (
    {
      "image/png": ".png",
      "image/jpeg": ".jpg",
      "image/webp": ".webp",
      "image/gif": ".gif",
      "image/avif": ".avif",
    }[mime] ?? ""
  );
}

export async function GET() {
  const userId = await getUserId();
  const visuels = await prisma.visual.findMany({ where: { userId }, orderBy: { createdAt: "asc" } });
  const payload: Visuel[] = visuels.map((v) => ({
    id: v.id,
    nom: v.nom,
    path: v.path,
    mimeType: v.mimeType,
    createdAt: v.createdAt.toISOString(),
  }));
  return NextResponse.json(payload);
}

export async function POST(request: Request) {
  const userId = await getUserId();
  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Requête invalide" }, { status: 400 });

  const fichiers = form.getAll("fichiers").filter((f): f is File => f instanceof File);
  if (!fichiers.length) return NextResponse.json({ error: "Aucun fichier" }, { status: 400 });

  const crees: Visuel[] = [];
  for (const fichier of fichiers) {
    if (!ALLOWED_TYPES.has(fichier.type)) continue;
    if (fichier.size > MAX_SIZE) continue;

    const id = nanoid();
    const ext = extensionPour(fichier.type) || path.extname(fichier.name) || "";
    // `id` (nanoid) garantit déjà l'unicité du chemin : pas de suffixe aléatoire,
    // l'URL reste prévisible.
    const blob = await put(`uploads/${id}${ext}`, fichier, {
      access: "public",
      contentType: fichier.type,
      addRandomSuffix: false,
    });

    const v = await prisma.visual.create({
      data: {
        id,
        nom: fichier.name || "image",
        path: blob.url,
        mimeType: fichier.type,
        userId,
      },
    });
    crees.push({ id: v.id, nom: v.nom, path: v.path, mimeType: v.mimeType, createdAt: v.createdAt.toISOString() });
  }

  if (!crees.length) {
    return NextResponse.json({ error: "Aucune image valide (type ou taille refusés)" }, { status: 400 });
  }

  return NextResponse.json(crees, { status: 201 });
}
