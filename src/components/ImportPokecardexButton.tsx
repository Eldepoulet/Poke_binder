"use client";

import { useRef, useState } from "react";
import type { ImportResume } from "@/lib/types";

export default function ImportPokecardexButton({ onImported }: { onImported?: () => void }) {
  const fichierRef = useRef<HTMLInputElement>(null);
  const [importEnCours, setImportEnCours] = useState(false);
  const [resume, setResume] = useState<ImportResume | null>(null);

  async function importerCsv(fichier: File) {
    setImportEnCours(true);
    setResume(null);
    try {
      const texte = await fichier.text();
      const res = await fetch("/api/collection/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv: texte }),
      });
      if (!res.ok) throw new Error("import refusé");
      const data: ImportResume = await res.json();
      setResume(data);
      onImported?.();
    } catch {
      setResume({ importees: 0, setsNotFound: [], cardsNotFound: [], skippedSpecial: 0 });
    } finally {
      setImportEnCours(false);
    }
  }

  return (
    <>
      <div className="collection-import">
        <button className="outil" disabled={importEnCours} onClick={() => fichierRef.current?.click()}>
          {importEnCours ? "Import en cours…" : "Importer Pokecardex"}
        </button>
        <input
          ref={fichierRef}
          type="file"
          accept=".csv,text/csv"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) importerCsv(f);
            e.target.value = "";
          }}
        />
      </div>

      {resume && (
        <div className="import-resume">
          <p>
            <b>{resume.importees}</b> ligne{resume.importees > 1 ? "s" : ""} importée{resume.importees > 1 ? "s" : ""}
            {resume.skippedSpecial ? ` · ${resume.skippedSpecial} variante(s) spéciale(s) ignorée(s)` : ""}
          </p>
          {!!resume.setsNotFound.length && (
            <p>Extensions non reconnues : {resume.setsNotFound.join(", ")}</p>
          )}
          {!!resume.cardsNotFound.length && (
            <p>
              {resume.cardsNotFound.length} carte(s) non trouvée(s), ex. :{" "}
              {resume.cardsNotFound
                .slice(0, 5)
                .map((c) => `${c.nom} (${c.serie} ${c.numero})`)
                .join(", ")}
            </p>
          )}
          <button className="outil" onClick={() => setResume(null)}>
            Fermer
          </button>
        </div>
      )}
    </>
  );
}
