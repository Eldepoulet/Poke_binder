"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/swr";
import type { SetMeta } from "@/lib/types";
import { trierParSortieDesc } from "@/lib/setsOrder";

// Sélecteur des 202 extensions, regroupées par série (époque), avec
// recherche par nom/code. Partagé entre la création d'un classeur "master
// set" et le tiroir de cartes / picker d'un classeur personnalisé — mêmes
// données (/api/sets), même liste, filtrée côté client (catalogue de
// métadonnées, pas de cartes : 202 lignes, sans souci de volume).
export default function SelecteurExtension({
  valeurActuelle,
  onChoisir,
}: {
  valeurActuelle?: string | null;
  onChoisir: (code: string) => void;
}) {
  const { data: sets } = useSWR<SetMeta[]>("/api/sets", fetcher);
  const [q, setQ] = useState("");

  const query = q.trim().toLowerCase();
  const groupes = useMemo(() => {
    const filtrees = !sets
      ? []
      : !query
      ? sets
      : sets.filter((s) => s.name.toLowerCase().includes(query) || s.code.toLowerCase().includes(query));

    // Tri chronologique (le plus récent d'abord) : l'ordre d'insertion dans
    // la Map suit l'ordre de première apparition, donc trier la liste à
    // plat réordonne aussi bien les groupes que leur contenu.
    const triees = trierParSortieDesc(filtrees);

    const map = new Map<string, SetMeta[]>();
    for (const s of triees) {
      const cle = s.serieName ?? "Autre";
      if (!map.has(cle)) map.set(cle, []);
      map.get(cle)!.push(s);
    }
    return [...map.entries()];
  }, [sets, query]);

  return (
    <div className="selecteur-ext">
      <input
        className="champ"
        type="search"
        placeholder="Chercher une extension"
        autoComplete="off"
        autoFocus
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      {!sets && <p className="vide">Chargement des extensions…</p>}
      <div className="ext-groupes">
        {groupes.map(([serie, items]) => (
          <div key={serie} className="ext-groupe">
            <h5>{serie}</h5>
            <div className="ext-liste">
              {items.map((s) => (
                <button
                  key={s.code}
                  type="button"
                  className={`ext-item${valeurActuelle === s.code ? " sel" : ""}`}
                  title={s.code}
                  onClick={() => onChoisir(s.code)}
                >
                  {s.logo ? (
                    <img
                      src={`${s.logo}.png`}
                      alt=""
                      loading="lazy"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <span className="ext-vide" />
                  )}
                  <span className="ext-nom">{s.name}</span>
                  {s.cardCount != null && <em>{s.cardCount}</em>}
                </button>
              ))}
            </div>
          </div>
        ))}
        {sets && !groupes.length && <p className="vide">Aucune extension ne correspond.</p>}
      </div>
    </div>
  );
}
