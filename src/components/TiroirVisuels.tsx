"use client";

import { useRef } from "react";
import type { Visuel } from "@/lib/types";
import type { Selection } from "./TiroirCartes";

export default function TiroirVisuels({
  actif,
  visuels,
  selection,
  depotActif,
  onImporterFichiers,
}: {
  actif: boolean;
  visuels: Visuel[];
  selection: Selection;
  depotActif: boolean;
  onImporterFichiers: (fichiers: FileList) => void;
}) {
  const fichierRef = useRef<HTMLInputElement>(null);

  return (
    <section className="panneau" id="panVisuels" data-actif={actif}>
      <header>
        <button className="outil" onClick={() => fichierRef.current?.click()}>
          Ajouter des images
        </button>
        <input
          type="file"
          accept="image/*"
          multiple
          hidden
          ref={fichierRef}
          onChange={(e) => {
            if (e.target.files?.length) onImporterFichiers(e.target.files);
            e.target.value = "";
          }}
        />
        <div className="compte">
          {visuels.length ? `${visuels.length} image${visuels.length > 1 ? "s" : ""} en bibliothèque` : ""}
        </div>
      </header>
      <div id="depot" className={`depot${depotActif ? " actif" : ""}`}>
        Dépose des fichiers ici, ou directement sur une pochette du classeur.
      </div>
      <div className="biblio">
        {!visuels.length && (
          <p className="vide">
            Aucune image pour l&apos;instant. Ajoute une illustration, elle restera dans ce classeur.
          </p>
        )}
        {visuels.map((v) => {
          const classes = ["visuel-item"];
          if (selection && selection.t === "i" && selection.a === v.id) classes.push("sel");
          return (
            <button key={v.id} className={classes.join(" ")} draggable data-visuel={v.id} title={v.nom}>
              <img src={v.path} alt={v.nom} loading="lazy" />
              <span className="sup" data-supprimer={v.id} title="Supprimer de la bibliothèque">
                ×
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
