"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import SelecteurExtension from "@/components/SelecteurExtension";
import ImportPokecardexButton from "@/components/ImportPokecardexButton";

export default function CollectionPage() {
  const router = useRouter();
  const [resetEnCours, setResetEnCours] = useState(false);
  const [resetFait, setResetFait] = useState(false);

  async function reinitialiser() {
    const ok = window.confirm(
      "Cette action supprime TOUTES les cartes possédées, y compris celles cochées à la main dans tes classeurs. Cette action est irréversible. Continuer ?"
    );
    if (!ok) return;
    setResetEnCours(true);
    setResetFait(false);
    try {
      await fetch("/api/collection/reset", { method: "DELETE" });
      setResetFait(true);
      router.refresh();
    } finally {
      setResetEnCours(false);
    }
  }

  return (
    <div className="accueil">
      <a className="accueil-retour" href="/">
        ← Accueil
      </a>
      <div className="collection-tete">
        <div className="collection-titre">
          <h1>Collection</h1>
          <p className="vide" style={{ textAlign: "left", padding: 0 }}>
            Choisis une extension pour voir tes cartes et ce que tu possèdes.
          </p>
        </div>
        <div className="collection-actions">
          <ImportPokecardexButton onImported={() => router.refresh()} />
          <button className="outil" disabled={resetEnCours} onClick={reinitialiser}>
            {resetEnCours ? "Réinitialisation…" : "Réinitialiser"}
          </button>
        </div>
      </div>
      {resetFait && (
        <div className="import-resume">
          <p>Collection réinitialisée.</p>
          <button className="outil" onClick={() => setResetFait(false)}>
            Fermer
          </button>
        </div>
      )}
      <SelecteurExtension variant="grille" onChoisir={(code) => router.push(`/collection/${code}`)} />
    </div>
  );
}
