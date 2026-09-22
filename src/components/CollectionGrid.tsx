"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Carte, Quantites, QuantiteMap, SetMeta } from "@/lib/types";
import CardImage from "./CardImage";
import ImportPokecardexButton from "./ImportPokecardexButton";

const LIBELLE: Record<"n" | "r" | "h" | "p" | "m", string> = {
  n: "Normale",
  r: "Reverse",
  h: "Holo",
  p: "Reverse Poké Ball",
  m: "Reverse Master Ball",
};

function possedeUne(q: Quantites | undefined): boolean {
  return !!q && (q.n > 0 || q.r > 0 || q.h > 0 || q.p > 0 || q.m > 0);
}

function enDouble(q: Quantites | undefined): boolean {
  return !!q && (q.n >= 2 || q.r >= 2 || q.h >= 2 || q.p >= 2 || q.m >= 2);
}

export default function CollectionGrid({
  set,
  cartes,
  quantitesInitiales,
}: {
  set: SetMeta;
  cartes: Carte[];
  quantitesInitiales: QuantiteMap;
}) {
  const router = useRouter();

  // Copie locale pour permettre le cocher/décocher immédiat depuis cette
  // page (cf. alternerVariante) sans attendre un aller-retour serveur ;
  // resynchronisée si le parent renvoie des props fraîches (après un
  // import CSV, qui appelle déjà router.refresh()).
  const [quantites, setQuantites] = useState<QuantiteMap>(quantitesInitiales);
  useEffect(() => setQuantites(quantitesInitiales), [quantitesInitiales]);

  const [recherche, setRecherche] = useState("");
  const [rarete, setRarete] = useState("");
  const [categorie, setCategorie] = useState("");
  const [statut, setStatut] = useState<"toutes" | "possedees" | "manquantes">("toutes");
  const [doublesSeulement, setDoublesSeulement] = useState(false);

  // Coche/décoche manuellement une variante depuis la page Collection —
  // même mécanisme que la case à cocher de la fiche carte d'un classeur
  // (CollectionEntry est globale, cf. lib/binders.ts). Bascule simple
  // (comme le classeur) : pas un compteur — cliquer ajoute/retire une seule
  // copie "manuel", quel que soit le total affiché (éventuellement cumulé
  // avec un import Pokecardex).
  function alternerVariante(carteId: string, cle: "n" | "r" | "h" | "p" | "m", on: boolean) {
    setQuantites((prev) => {
      const q = { ...(prev[carteId] ?? { n: 0, r: 0, h: 0, p: 0, m: 0 }) };
      q[cle] = on ? Math.max(1, q[cle]) : 0;
      return { ...prev, [carteId]: q };
    });
    fetch("/api/ownership", {
      method: on ? "POST" : "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cardId: carteId, variante: cle }),
    }).catch(() => {});
  }

  const raretes = useMemo(
    () => [...new Set(cartes.map((c) => c.rarete))].filter((v): v is string => !!v).sort((a, b) => a.localeCompare(b, "fr")),
    [cartes]
  );
  const categories = useMemo(
    () => [...new Set(cartes.map((c) => c.categorie))].filter((v): v is string => !!v).sort((a, b) => a.localeCompare(b, "fr")),
    [cartes]
  );

  const possedeesCount = cartes.filter((c) => possedeUne(quantites[c.id])).length;

  const q = recherche.trim().toLowerCase();
  const liste = cartes.filter((c) => {
    if (q && !(c.nom || "").toLowerCase().includes(q) && !c.numero.includes(q)) return false;
    if (rarete && c.rarete !== rarete) return false;
    if (categorie && c.categorie !== categorie) return false;
    const poss = possedeUne(quantites[c.id]);
    if (statut === "possedees" && !poss) return false;
    if (statut === "manquantes" && poss) return false;
    if (doublesSeulement && !enDouble(quantites[c.id])) return false;
    return true;
  });

  return (
    <div className="collection">
      <header className="collection-tete">
        <div className="collection-titre">
          <a className="accueil-retour" href="/collection">
            ← Extensions
          </a>
          <h1>{set.name}</h1>
          <span className="compte">
            {possedeesCount} / {cartes.length} cartes possédées (au moins une variante)
          </span>
        </div>
        <ImportPokecardexButton onImported={() => router.refresh()} />
      </header>

      <div className="collection-filtres">
        <input
          className="champ"
          type="search"
          placeholder="Nom ou numéro"
          autoComplete="off"
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
        />
        <select value={rarete} onChange={(e) => setRarete(e.target.value)}>
          <option value="">Toutes raretés</option>
          {raretes.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <select value={categorie} onChange={(e) => setCategorie(e.target.value)}>
          <option value="">Toutes catégories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <div className="bascules">
          <button className="bascule" aria-pressed={statut === "possedees"} onClick={() => setStatut((s) => (s === "possedees" ? "toutes" : "possedees"))}>
            Possédées
          </button>
          <button className="bascule" aria-pressed={statut === "manquantes"} onClick={() => setStatut((s) => (s === "manquantes" ? "toutes" : "manquantes"))}>
            Manquantes
          </button>
          <button className="bascule" aria-pressed={doublesSeulement} onClick={() => setDoublesSeulement((v) => !v)}>
            En double
          </button>
        </div>
        <div className="compte">
          {liste.length} carte{liste.length > 1 ? "s" : ""} affichée{liste.length > 1 ? "s" : ""}
        </div>
      </div>

      <div className="collection-grille">
        {!liste.length && <p className="vide">Aucune carte ne correspond. Assouplis la recherche ou les filtres.</p>}
        {liste.map((c) => {
          const qte = quantites[c.id];
          const dispo: Record<"n" | "r" | "h" | "p" | "m", boolean> = {
            n: c.varNormal,
            r: c.varReverse,
            h: c.varHolo,
            p: c.varReversePokeball,
            m: c.varReverseMasterball,
          };
          return (
            <div key={c.id} className={`collection-carte${possedeUne(qte) ? "" : " manquante"}`}>
              <div className="collection-image">
                <CardImage carte={c} hd />
              </div>
              <div className="collection-nom">
                {c.nom} <span>n° {c.numero}</span>
              </div>
              <div className="collection-quantites">
                {(["n", "r", "h", "p", "m"] as const).map((k) => {
                  if (!dispo[k]) return null;
                  const on = !!qte && qte[k] > 0;
                  return (
                    <button
                      key={k}
                      type="button"
                      className={`quantite-badge${on ? " on" : ""}`}
                      title={`${LIBELLE[k]}${on ? " — cliquer pour retirer" : " — cliquer pour ajouter"}`}
                      onClick={() => alternerVariante(c.id, k, !on)}
                    >
                      {k.toUpperCase()}×{qte ? qte[k] : 0}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
