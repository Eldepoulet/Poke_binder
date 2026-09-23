import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { nanoid } from "nanoid";
import { prisma } from "@/lib/prisma";
import { getBinder, saveBinder } from "@/lib/binders";
import { getUserId } from "@/lib/current-user";
import type { Case, ExportPayload, ImageExportee } from "@/lib/types";

export const dynamic = "force-dynamic";

const MAX_SIZE = 4 * 1024 * 1024; // 4 Mo par image, comme à l'upload
// Chaque image importée enchaîne un téléchargement puis un envoi vers le
// stockage objet : on parallélise par petits lots pour tenir dans les 10 s
// allouées aux fonctions sur le plan Hobby, sans ouvrir 50 requêtes d'un coup.
const TAILLE_LOT = 5;

// L'URL provient d'un fichier fourni par l'utilisateur : sans restriction, un
// import piégé ferait émettre au serveur des requêtes arbitraires, y compris
// vers des adresses internes (SSRF). Seuls les blobs publics sont acceptés.
function urlBlobAutorisee(brut: string): boolean {
  try {
    const u = new URL(brut);
    return u.protocol === "https:" && u.hostname.endsWith(".public.blob.vercel-storage.com");
  } catch {
    return false;
  }
}

async function contenuImage(im: ImageExportee): Promise<Buffer | null> {
  // v3 : l'image est embarquée en base64 dans le fichier d'export.
  if (typeof im.data === "string" && im.data) {
    const buffer = Buffer.from(im.data, "base64");
    return buffer.byteLength > MAX_SIZE ? null : buffer;
  }
  // v4 : l'image est référencée par son URL publique.
  if (typeof im.url === "string" && urlBlobAutorisee(im.url)) {
    const reponse = await fetch(im.url);
    if (!reponse.ok) return null;
    const buffer = Buffer.from(await reponse.arrayBuffer());
    return buffer.byteLength > MAX_SIZE ? null : buffer;
  }
  return null;
}

function lots<T>(items: T[], taille: number): T[][] {
  const sortie: T[][] = [];
  for (let i = 0; i < items.length; i += taille) sortie.push(items.slice(i, i + taille));
  return sortie;
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const userId = await getUserId();
  const existing = await getBinder(params.id, userId);
  if (!existing) return NextResponse.json({ error: "Classeur introuvable" }, { status: 404 });

  const body = (await request.json().catch(() => null)) as ExportPayload | null;
  if (
    !body ||
    (body.version !== 3 && body.version !== 4) ||
    ![2, 3, 4].includes(body.format) ||
    !Array.isArray(body.cases)
  ) {
    return NextResponse.json(
      { error: "Fichier illisible ou export d'une ancienne version incompatible. Choisis un export produit par ce classeur." },
      { status: 400 }
    );
  }

  // Les images importées reçoivent un nouvel identifiant pour ne jamais
  // entrer en collision avec la bibliothèque déjà présente sur ce serveur.
  const idMap = new Map<string, string>();
  for (const lot of lots(body.images ?? [], TAILLE_LOT)) {
    const resultats = await Promise.all(
      lot.map(async (im): Promise<[string, string] | null> => {
        try {
          const contenu = await contenuImage(im);
          if (!contenu) return null;

          const id = nanoid();
          const mimeType = im.type || "image/png";
          const ext = mimeType.split("/")[1] ? `.${mimeType.split("/")[1]}` : "";
          const blob = await put(`uploads/${id}${ext}`, contenu, {
            access: "public",
            contentType: mimeType,
            addRandomSuffix: false,
          });

          await prisma.visual.create({
            data: { id, nom: im.nom || "image", path: blob.url, mimeType, userId },
          });
          return [im.id, id];
        } catch {
          // image corrompue ou injoignable : on l'ignore, les cases qui la
          // référencent seront vidées ci-dessous.
          return null;
        }
      })
    );
    for (const r of resultats) if (r) idMap.set(r[0], r[1]);
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
  await saveBinder(params.id, { format: body.format, cases }, userId);

  return NextResponse.json({ ok: true });
}
