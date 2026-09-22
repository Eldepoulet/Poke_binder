"use client";

import { useEffect, useState } from "react";
import type { Carte } from "@/lib/types";

function sourcesCarte(carte: Carte, hd: boolean): string[] {
  const ordre = hd
    ? [carte.imageUrl, carte.imageLocal, carte.imageLow]
    : [carte.imageLocal, carte.imageLow, carte.imageUrl];
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
