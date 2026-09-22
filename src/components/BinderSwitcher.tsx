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

  async function creerMaster(set: string) {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/binders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "master", set }),
      });
      const { id } = await res.json();
      router.push(`/classeur/${id}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="accueil">
      <a className="accueil-retour" href="/">
        ← Accueil
      </a>
      <h1>Mes classeurs</h1>

      <div className="classeurs-liste">
        {classeurs.map((c) => (
          <a key={c.id} className="classeur-carte" href={`/classeur/${c.id}`}>
            <b>{c.nom}</b>
            <span>{c.type === "master" ? "Master set" : "Classeur personnalisé"}</span>
          </a>
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

      {creation === "master" && (
        <div className="nouveau-classeur">
          <p className="vide">Toutes les cartes d'une extension, rangées automatiquement. Choisis-la :</p>
          <SelecteurExtension onChoisir={creerMaster} />
          <div className="actions">
            <button className="outil" onClick={() => setCreation(null)}>
              Annuler
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
