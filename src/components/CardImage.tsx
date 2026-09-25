"use client";

import { useEffect, useState } from "react";
import type { Carte } from "@/lib/types";

// tcgdex sert la même image en basse définition sous `low.webp` : on la déduit
// quand seule la version `high` est connue en base.
function basseDefinition(url: string | null): string | null {
  if (!url || !url.includes("assets.tcgdex.net")) return null;
  const low = url.replace(/\/high\.(webp|png|jpg)$/, "/low.$1");
  return low !== url ? low : null;
}

function sourcesCarte(carte: Carte, hd: boolean): string[] {
  const low = carte.imageLow ?? basseDefinition(carte.imageUrl);
  const ordre = hd
    ? [carte.imageUrl, carte.imageLocal, low]
    : [carte.imageLocal, low, carte.imageUrl];
  return ordre.filter((s): s is string => !!s);
}

export default function CardImage({
  carte,
  hd = false,
  alt,
  onEpuise,
}: {
  carte: Carte;
  hd?: boolean;
  alt?: string;
  onEpuise?: () => void;
}) {
  const sources = sourcesCarte(carte, hd);
  const [index, setIndex] = useState(0);

  // Nouvelle carte (ex: navigation dans la fiche) : on repart de la première source.
  useEffect(() => setIndex(0), [carte.id, hd]);

  useEffect(() => {
    if (index >= sources.length) onEpuise?.();
    // sources.length dépend de `carte`, capturé ci-dessus ; on ne veut réagir
    // qu'aux changements d'index/carte, pas recréer la liste à chaque rendu.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, carte.id, hd]);

  if (index >= sources.length) return null;

  return (
    <img
      src={sources[index]}
      alt={alt ?? `${carte.nom} — n° ${carte.numero}`}
      loading="lazy"
      decoding="async"
      onError={() => setIndex((i) => i + 1)}
    />
  );
}
