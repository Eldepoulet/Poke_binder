"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ClasseurResume } from "@/lib/types";
import SelecteurExtension from "./SelecteurExtension";

export default function BinderSwitcher({ classeurs }: { classeurs: ClasseurResume[] }) {
  const router = useRouter();
  const [creation, setCreation] = useState<null | "custom" | "master">(null);
  const [nom, setNom] = useState("");
  const [busy, setBusy] = useState(false);
  const [setChoisi, setSetChoisi] = useState<string | null>(null);

  async function creerCustom() {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/binders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "custom", nom: nom.trim() || "Nouveau classeur" }),
      });
      const { id } = await res.json();
      router.push(`/classeur/${id}`);
    } finally {
      setBusy(false);
    }
  }

  async function creerMaster(set: string, variantes: "normale" | "normale_reverse") {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/binders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "master", set, variantes }),
      });
      const { id } = await res.json();
      router.push(`/classeur/${id}`);
    } finally {
      setBusy(false);
    }
  }

  async function supprimerClasseur(c: ClasseurResume) {
    if (!confirm(`Supprimer le classeur "${c.nom}" ? Cette action est irréversible.`)) return;
    await fetch(`/api/binders/${c.id}`, { method: "DELETE" }).catch(() => {});
    router.refresh();
  }

  return (
    <div className="accueil">
      <a className="accueil-retour" href="/">
        ← Accueil
      </a>
      <h1>Mes classeurs</h1>

      <div className="classeurs-liste">
        {classeurs.map((c) => (
          <div key={c.id} className="classeur-cadre">
            <a className="classeur-carte" href={`/classeur/${c.id}`}>
              <b>{c.nom}</b>
              <span>{c.type === "master" ? "Master set" : "Classeur personnalisé"}</span>
            </a>
            <button
              type="button"
              className="classeur-supprimer"
              title="Supprimer ce classeur"
              aria-label={`Supprimer le classeur ${c.nom}`}
              onClick={(e) => {
                e.preventDefault();
                supprimerClasseur(c);
              }}
            >
              ×
            </button>
          </div>
        ))}
        {!classeurs.length && <p className="vide">Aucun classeur pour l'instant — crée le premier ci-dessous.</p>}
      </div>

      {!creation && (
        <div className="actions">
          <button className="outil" onClick={() => setCreation("custom")}>
            + Classeur personnalisé
          </button>
          <button className="outil" onClick={() => setCreation("master")}>
            + Master set
          </button>
        </div>
      )}

      {creation === "custom" && (
        <div className="nouveau-classeur">
          <p className="vide">Un classeur libre : pioche des cartes dans n'importe quelle extension.</p>
          <input
            className="champ"
            placeholder="Nom du classeur"
            autoFocus
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && creerCustom()}
          />
          <div className="actions">
            <button className="outil" disabled={busy} onClick={creerCustom}>
              Créer
            </button>
            <button className="outil" onClick={() => setCreation(null)}>
              Annuler
            </button>
          </div>
        </div>
      )}

      {creation === "master" && !setChoisi && (
        <div className="nouveau-classeur">
          <p className="vide">Toutes les cartes d'une extension, rangées automatiquement. Choisis-la :</p>
          <SelecteurExtension onChoisir={setSetChoisi} />
          <div className="actions">
            <button className="outil" onClick={() => setCreation(null)}>
              Annuler
            </button>
          </div>
        </div>
      )}

      {creation === "master" && setChoisi && (
        <div className="nouveau-classeur">
          <p className="vide">
            Quelles cartes inclure pour chaque numéro ? "Normale + Reverse" ajoute une case par copie possédable
            (normale, reverse — et Poké Ball/Master Ball pour les sets qui les ont, comme Évolutions Prismatiques).
          </p>
          <div className="actions">
            <button className="outil" disabled={busy} onClick={() => creerMaster(setChoisi, "normale")}>
              Normale seule
            </button>
            <button className="outil" disabled={busy} onClick={() => creerMaster(setChoisi, "normale_reverse")}>
              Normale + Reverse
            </button>
          </div>
          <div className="actions">
            <button className="outil" onClick={() => setSetChoisi(null)}>
              ← Changer d'extension
            </button>
            <button
              className="outil"
              onClick={() => {
                setCreation(null);
                setSetChoisi(null);
              }}
            >
              Annuler
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
