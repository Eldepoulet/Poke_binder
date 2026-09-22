"use client";

import { useEffect, useState } from "react";
import type { Carte, Case, CaseVisuel, Possede, Visuel } from "@/lib/types";
import type { Tuile } from "@/lib/grille";
import CardImage from "./CardImage";

function styleVisuel(e: CaseVisuel, visuel: Visuel | undefined, tuile: { w: number; h: number; c: number; r: number } | null): React.CSSProperties {
  if (!visuel) return {};
  const style: React.CSSProperties = { backgroundImage: `url("${visuel.path}")` };
  if (tuile) {
    style.backgroundSize = `${tuile.w * 100}% ${tuile.h * 100}%`;
    const px = tuile.w > 1 ? (tuile.c / (tuile.w - 1)) * 100 : 50;
    const py = tuile.h > 1 ? (tuile.r / (tuile.h - 1)) * 100 : 50;
    style.backgroundPosition = `${px}% ${py}%`;
  } else {
    style.backgroundSize = "cover";
    style.backgroundPosition = `${e.x}% ${e.y}%`;
  }
  return style;
}

const LIBELLE_VARIANTE: Record<"n" | "r" | "h", string> = { n: "Normale", r: "Reverse", h: "Holo" };

export default function Pochette({
  indice,
  format,
  entry,
  tuile,
  carte,
  visuel,
  possede,
  estCible,
  numeroPlaceholder,
}: {
  indice: number;
  format: number;
  entry: Case;
  tuile: Tuile | null;
  carte?: Carte;
  visuel?: Visuel;
  possede?: Possede;
  estCible: boolean;
  numeroPlaceholder: number;
}) {
  const [manquant, setManquant] = useState(false);
  useEffect(() => setManquant(false), [carte?.id]);

  const classes = ["pochette"];
  if (estCible) classes.push("cible");

  if (tuile) {
    classes.push("visuel");
    return (
      <button
        className={classes.join(" ")}
        data-ancre={tuile.ancre}
        style={styleVisuel(tuile.e, visuel, { w: tuile.w, h: tuile.h, c: tuile.c, r: tuile.r })}
        aria-label="Morceau d'un visuel"
      />
    );
  }

  if (entry && entry.t === "c" && carte) {
    if (manquant) classes.push("manquant");
    const titre = `${carte.nom} — n° ${carte.numero}${carte.rarete ? " · " + carte.rarete : ""}`;
    return (
      <button
        className={classes.join(" ")}
        draggable
        data-indice={indice}
        title={titre}
        aria-label={titre}
      >
        {manquant && (
          <span className="place">{`${carte.nom}\nn° ${carte.numero}`}</span>
        )}
        <CardImage carte={carte} onEpuise={() => setManquant(true)} />
        <div className="variantes">
          {(["n", "r", "h"] as const).map((k) => {
            const dispo = k === "n" ? carte.varNormal : k === "r" ? carte.varReverse : carte.varHolo;
            if (!dispo) return null;
            const on = possede ? possede[k] : false;
            return (
              <i
                key={k}
                className={on ? `on-${k}` : ""}
                title={`${LIBELLE_VARIANTE[k]}${on ? " — possédée" : " — manquante"}`}
              />
            );
          })}
        </div>
        <div className="etiquette">
          <span>{carte.nom}</span>
          <span>{carte.numero}</span>
        </div>
      </button>
    );
  }

  if (entry && entry.t === "i") {
    const n = format;
    const local = indice % (n * n);
    const w = Math.min(entry.w, n - (local % n));
    const h = Math.min(entry.h, n - Math.floor(local / n));
    const style = styleVisuel(entry, visuel, entry.mode === "tuile" ? { w, h, c: 0, r: 0 } : null);
    if (entry.mode === "continu" && (w > 1 || h > 1)) {
      style.gridColumn = `span ${w}`;
      style.gridRow = `span ${h}`;
    }
    classes.push("visuel");
    const titre = visuel ? visuel.nom : "Visuel";
    return (
      <button className={classes.join(" ")} draggable data-indice={indice} style={style} title={titre} aria-label={`Visuel : ${titre}`} />
    );
  }

  return (
    <button className={classes.join(" ")} data-indice={indice} title="Case vide — cliquer pour chercher une carte" aria-label={`Case ${numeroPlaceholder}, vide. Chercher une carte`}>
      <span className="place">{numeroPlaceholder}</span>
    </button>
  );
}
