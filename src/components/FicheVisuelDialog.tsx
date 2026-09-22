"use client";

import type { CaseVisuel, Format, Visuel } from "@/lib/types";

export default function FicheVisuelDialog({
  entry,
  format,
  visuel,
  onChangerTaille,
  onChangerMode,
  onChangerCadrage,
  onMettreCarte,
  onRetirer,
  onFermer,
}: {
  entry: CaseVisuel;
  format: Format;
  visuel?: Visuel;
  onChangerTaille: (champ: "w" | "h", valeur: number) => void;
  onChangerMode: (mode: "continu" | "tuile") => void;
  onChangerCadrage: (champ: "x" | "y", valeur: number) => void;
  onMettreCarte: () => void;
  onRetirer: () => void;
  onFermer: () => void;
}) {
  const options = (max: number, val: number) =>
    Array.from({ length: max }, (_, i) => (
      <option key={i + 1} value={i + 1}>
        {i + 1}
      </option>
    ));

  return (
    <div className="fiche">
      <div className="apercu" style={{ aspectRatio: "4/3" }}>
        {visuel && <img src={visuel.path} alt={visuel.nom} />}
      </div>
      <div>
        <h3>Visuel</h3>
        <p className="meta">{visuel ? visuel.nom : "Image absente de la bibliothèque"}</p>
        <h4>Emprise sur la page</h4>
        <div className="taille">
          <label>
            Largeur{" "}
            <select value={entry.w} onChange={(e) => onChangerTaille("w", +e.target.value)}>
              {options(format, entry.w)}
            </select>
          </label>
          <label>
            Hauteur{" "}
            <select value={entry.h} onChange={(e) => onChangerTaille("h", +e.target.value)}>
              {options(format, entry.h)}
            </select>
          </label>
          <label>
            Rendu{" "}
            <select value={entry.mode} onChange={(e) => onChangerMode(e.target.value as "continu" | "tuile")}>
              <option value="continu">Image continue</option>
              <option value="tuile">Découpée en pochettes</option>
            </select>
          </label>
        </div>
        <h4>Cadrage</h4>
        <div className="reglage">
          <span>Horizontal</span>
          <input
            type="range"
            min={0}
            max={100}
            value={entry.x}
            onChange={(e) => onChangerCadrage("x", +e.target.value)}
          />
          <output>{entry.x}%</output>
        </div>
        <div className="reglage">
          <span>Vertical</span>
          <input
            type="range"
            min={0}
            max={100}
            value={entry.y}
            onChange={(e) => onChangerCadrage("y", +e.target.value)}
          />
          <output>{entry.y}%</output>
        </div>
        <div className="actions">
          <button className="outil" onClick={onMettreCarte}>
            Mettre une carte à la place
          </button>
          <button className="outil" onClick={onRetirer}>
            Retirer de la page
          </button>
          <button className="outil" onClick={onFermer}>
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
