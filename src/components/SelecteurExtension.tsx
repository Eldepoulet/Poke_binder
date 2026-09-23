"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/swr";
import type { SetMeta } from "@/lib/types";
import { trierParSortieDesc } from "@/lib/setsOrder";

function pourcentage(owned: number, total: number): number {
  return total > 0 ? Math.round((owned / total) * 100) : 0;
}

// Vignette d'une extension en vue "grille" (page Collection) : logo, badge
// code, et avancement (cartes possédées / total + barre). Le logo TCGdex vit
// à `${logo}.png` (même convention que la vue liste) ; à défaut de logo,
// repli sur le symbole (petit pictogramme) puis sur le nom en texte.
function TuileExtension({ set, onChoisir }: { set: SetMeta; onChoisir: (code: string) => void }) {
  const total = set.cardCount ?? 0;
  const pct = pourcentage(set.owned, total);
  return (
    <button type="button" className="ext-carte" title={set.code} onClick={() => onChoisir(set.code)}>
      <span className="ext-carte-badge">{set.code}</span>
      <span className="ext-carte-visuel">
        {set.logo ? (
          <img
            src={`${set.logo}.png`}
            alt=""
            loading="lazy"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
        ) : set.symbol ? (
          <img src={`${set.symbol}.png`} alt="" loading="lazy" className="ext-carte-symbole" />
        ) : (
          <span className="ext-carte-nom-repli">{set.name}</span>
        )}
      </span>
      <span className="ext-carte-pied">
        <span className="ext-carte-nom">{set.name}</span>
        <span className="ext-carte-compte">
          {set.owned}/{total} <b>{pct}%</b>
        </span>
        <span className="ext-carte-barre">
          <i style={{ width: `${pct}%` }} />
        </span>
      </span>
    </button>
  );
}

// Sélecteur des 202 extensions, regroupées par série (époque), avec
// recherche par nom/code. Partagé entre la création d'un classeur "master
// set", le tiroir de cartes / picker d'un classeur personnalisé (`variant`
// par défaut, "liste" : compacte, pensée pour un panneau étroit) et la page
// Collection (`variant="grille"` : grandes tuiles avec avancement) — mêmes
// données (/api/sets), même liste, filtrée côté client (catalogue de
// métadonnées, pas de cartes : 202 lignes, sans souci de volume).
export default function SelecteurExtension({
  valeurActuelle,
  onChoisir,
  variant = "liste",
}: {
  valeurActuelle?: string | null;
  onChoisir: (code: string) => void;
  variant?: "liste" | "grille";
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

    // Tri chronologique (le plus récent d'abord), séries spéciales (McDo,
    // TCG Pocket) reléguées en fin de liste : l'ordre d'insertion dans la
    // Map suit l'ordre de première apparition, donc trier la liste à plat
    // réordonne aussi bien les groupes que leur contenu.
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
      <div className={variant === "grille" ? "ext-groupes ext-groupes-page" : "ext-groupes"}>
        {groupes.map(([serie, items]) => {
          if (variant !== "grille") {
            return (
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
            );
          }

          const totalGroupe = items.reduce((acc, s) => acc + (s.cardCount ?? 0), 0);
          const ownedGroupe = items.reduce((acc, s) => acc + s.owned, 0);
          return (
            <div key={serie} className="ext-groupe">
              <div className="ext-groupe-entete">
                <h5>{serie}</h5>
                <span className="ext-groupe-compte">
                  {ownedGroupe}/{totalGroupe} · {pourcentage(ownedGroupe, totalGroupe)}%
                </span>
              </div>
              <div className="ext-grille">
                {items.map((s) => (
                  <TuileExtension key={s.code} set={s} onChoisir={onChoisir} />
                ))}
              </div>
            </div>
          );
        })}
        {sets && !groupes.length && <p className="vide">Aucune extension ne correspond.</p>}
      </div>
    </div>
  );
}
