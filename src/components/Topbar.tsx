"use client";

import { useRef } from "react";
import type { Format } from "@/lib/types";

export default function Topbar({
  titre,
  sousTitre,
  compteur,
  total,
  format,
  onFormat,
  onRanger,
  onVider,
  onExport,
  onImport,
}: {
  titre: string;
  sousTitre: string;
  compteur: number;
  total: number;
  format: Format;
  onFormat: (f: Format) => void;
  onRanger: () => void;
  onVider: () => void;
  onExport: () => void;
  onImport: (fichier: File) => void;
}) {
  const fichierRef = useRef<HTMLInputElement>(null);
  const pourcentage = total ? (100 * compteur) / total : 0;

  return (
    <header className="topbar">
      <a className="brand-accueil" href="/classeurs" title="Retour à mes classeurs">
        ←
      </a>
      <div className="brand">
        <b>{titre}</b>
        <span>{sousTitre}</span>
      </div>
      <div className="jauge" title="Cartes dont tu possèdes au moins une variante">
        <span>Collection</span>
        <span className="barre">
          <i style={{ width: `${pourcentage}%` }} />
        </span>
        <span>
          <b>{compteur}</b> / <span>{total}</span>
        </span>
      </div>
      <div className="segmented" role="group" aria-label="Format du classeur">
        {[2, 3, 4].map((f) => (
          <button key={f} aria-pressed={format === f} onClick={() => onFormat(f as Format)}>
            {f} × {f}
          </button>
        ))}
      </div>
      <button className="outil" onClick={onRanger}>
        Ranger par numéro
      </button>
      <button className="outil" onClick={onVider}>
        Vider le classeur
      </button>
      <button className="outil" onClick={onExport}>
        Exporter
      </button>
      <button className="outil" onClick={() => fichierRef.current?.click()}>
        Importer
      </button>
      <input
        type="file"
        accept="application/json"
        hidden
        ref={fichierRef}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onImport(f);
          e.target.value = "";
        }}
      />
    </header>
  );
}
