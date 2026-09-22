import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getBinder } from "@/lib/binders";
import BinderApp from "@/components/BinderApp";
import type { Carte, Case, Visuel } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ClasseurPage({ params }: { params: { id: string } }) {
  const binder = await getBinder(params.id);
  if (!binder) notFound();

  const visualRows = await prisma.visual.findMany({ orderBy: { createdAt: "asc" } });

  const cardRows =
    binder.type === "master" && binder.set
      ? await prisma.card.findMany({ where: { set: binder.set }, orderBy: { numero: "asc" } })
      : await (async () => {
          const ids = binder.cases
            .filter((c): c is Extract<Case, { t: "c" }> => !!c && c.t === "c")
            .map((c) => c.id);
          return ids.length ? prisma.card.findMany({ where: { id: { in: ids } } }) : [];
        })();

  const cartes: Carte[] = cardRows.map((c) => ({ ...c }));
  const visuels: Visuel[] = visualRows.map((v) => ({
    id: v.id,
    nom: v.nom,
    path: v.path,
    mimeType: v.mimeType,
    createdAt: v.createdAt.toISOString(),
  }));

  return (
    <BinderApp
      key={binder.id}
      binder={{ id: binder.id, nom: binder.nom, type: binder.type, set: binder.set }}
      cartesInitiales={cartes}
      visuelsInitiaux={visuels}
      formatInitial={binder.format}
      casesInitiales={binder.cases}
      possedeInitial={binder.possede}
    />
  );
}
