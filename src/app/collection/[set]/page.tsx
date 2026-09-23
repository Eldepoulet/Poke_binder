import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { quantitesPourSet } from "@/lib/ownership";
import { getUserId } from "@/lib/current-user";
import CollectionGrid from "@/components/CollectionGrid";
import type { Carte } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function CollectionSetPage({ params }: { params: { set: string } }) {
  const userId = await getUserId();
  const setRow = await prisma.set.findUnique({ where: { code: params.set } });
  if (!setRow) notFound();

  const cardRows = await prisma.card.findMany({ where: { set: params.set }, orderBy: { numero: "asc" } });
  const cartes: Carte[] = cardRows.map((c) => ({ ...c }));
  const quantites = await quantitesPourSet(params.set, userId);

  return <CollectionGrid set={setRow} cartes={cartes} quantitesInitiales={quantites} />;
}
