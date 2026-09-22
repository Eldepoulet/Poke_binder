"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Carte, Quantites, QuantiteMap, SetMeta } from "@/lib/types";
import CardImage from "./CardImage";
import ImportPokecardexButton from "./ImportPokecardexButton";

const LIBELLE: Record<"n" | "r" | "h", string> = { n: "Normale", r: "Reverse", h: "Holo" };

function possedeUne(q: Quantites | undefined): boolean {
  return !!q && (q.n > 0 || q.r > 0 || q.h > 0);
}

function enDouble(q: Quantites | undefined): boolean {
  return !!q && (q.n >= 2 || q.r >= 2 || q.h >= 2);
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

  const [recherche, setRecherche] = useState("");
  const [rarete, setRarete] = useState("");
  const [categorie, setCategorie] = useState("");
  const [statut, setStatut] = useState<"toutes" | "possedees" | "manquantes">("toutes");
  const [doublesSeulement, setDoublesSeulement] = useState(false);

  const raretes = useMemo(
    () => [...new Set(cartes.map((c) => c.rarete))].filter((v): v is string => !!v).sort((a, b) => a.localeCompare(b, "fr")),
    [cartes]
  );
  const categories = useMemo(
    () => [...new Set(cartes.map((c) => c.categorie))].filter((v): v is string => !!v).sort((a, b) => a.localeCompare(b, "fr")),
    [cartes]
  );

  const possedeesCount = cartes.filter((c) => possedeUne(quantitesInitiales[c.id])).length;

  const q = recherche.trim().toLowerCase();
  const liste = cartes.filter((c) => {
    if (q && !(c.nom || "").toLowerCase().includes(q) && !c.numero.includes(q)) return false;
    if (rarete && c.rarete !== rarete) return false;
    if (categorie && c.categorie !== categorie) return false;
    const poss = possedeUne(quantitesInitiales[c.id]);
    if (statut === "possedees" && !poss) return false;
    if (statut === "manquantes" && poss) return false;
    if (doublesSeulement && !enDouble(quantitesInitiales[c.id])) return false;
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
          const qte = quantitesInitiales[c.id];
          const dispo: Record<"n" | "r" | "h", boolean> = { n: c.varNormal, r: c.varReverse, h: c.varHolo };
          return (
            <div key={c.id} className={`collection-carte${possedeUne(qte) ? "" : " manquante"}`}>
              <div className="collection-image">
                <CardImage carte={c} hd />
              </div>
              <div className="collection-nom">
                {c.nom} <span>n° {c.numero}</span>
              </div>
              <div className="collection-quantites">
                {(["n", "r", "h"] as const).map((k) =>
                  dispo[k] ? (
                    <span key={k} className={`quantite-badge${qte && qte[k] > 0 ? " on" : ""}`} title={LIBELLE[k]}>
                      {LIBELLE[k][0]}×{qte ? qte[k] : 0}
                    </span>
                  ) : null
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
