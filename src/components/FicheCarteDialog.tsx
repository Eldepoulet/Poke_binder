"use client";

import type { Carte, Possede } from "@/lib/types";
import CardImage from "./CardImage";

const LIBELLE: Record<"n" | "r" | "h", string> = { n: "Normale", r: "Reverse", h: "Holo" };

export default function FicheCarteDialog({
  carte,
  possede,
  onToggleVariante,
  onRemplacer,
  onRetirer,
  onFermer,
}: {
  carte: Carte;
  possede: Possede;
  onToggleVariante: (cle: "n" | "r" | "h", val: boolean) => void;
  onRemplacer: () => void;
  onRetirer: () => void;
  onFermer: () => void;
}) {
  const dispo: Record<"n" | "r" | "h", boolean> = {
    n: carte.varNormal,
    r: carte.varReverse,
    h: carte.varHolo,
  };

  return (
    <div className="fiche">
      <div className="apercu">
        <CardImage carte={carte} hd />
      </div>
      <div>
        <h3>{carte.nom}</h3>
        <p className="meta">
          {`N° ${carte.numero} · ${carte.rarete ?? "rareté inconnue"}`}
          {carte.categorie ? ` · ${carte.categorie}` : ""}
          {carte.hp ? ` · ${carte.hp} PV` : ""}
          {carte.illustrateur ? ` — illustration : ${carte.illustrateur}` : ""}
        </p>
        <h4>Variantes possédées</h4>
        <div className="varlist">
          {(["n", "r", "h"] as const).map((k) => (
            <label key={k} className={dispo[k] ? "" : "absente"}>
              <input
                type="checkbox"
                checked={possede[k]}
                disabled={!dispo[k]}
                onChange={(e) => onToggleVariante(k, e.target.checked)}
              />
              <span>
                {LIBELLE[k]}
                {dispo[k] ? "" : " — n'existe pas pour cette carte"}
              </span>
            </label>
          ))}
        </div>
        <div className="actions">
          <button className="outil" onClick={onRemplacer}>
            Chercher une autre carte
          </button>
          <button className="outil" onClick={onRetirer}>
            Retirer du classeur
          </button>
          <button className="outil" onClick={onFermer}>
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
