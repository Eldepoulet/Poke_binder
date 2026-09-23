import { NextResponse } from "next/server";
import { unlink } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { retirerVisuelDesClasseurs } from "@/lib/binders";
import { getUserId } from "@/lib/current-user";

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const userId = await getUserId();
  const { id } = params;

  const visuel = await prisma.visual.findFirst({ where: { id, userId } });
  if (!visuel) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  // Retire le visuel des pages où il apparaît, dans tous les classeurs de
  // son propriétaire qui le référencent.
  await retirerVisuelDesClasseurs(id, userId);

  await prisma.visual.delete({ where: { id } });

  const filePath = path.join(process.cwd(), "public", visuel.path.replace(/^\//, ""));
  await unlink(filePath).catch(() => {
    /* fichier déjà absent : rien à faire */
  });

  return NextResponse.json({ ok: true });
}
