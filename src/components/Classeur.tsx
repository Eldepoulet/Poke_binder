"use client";

import type { Carte, Case, Format, Possede, PossedeMap, Visuel } from "@/lib/types";
import { analyse, nbPages, parPage } from "@/lib/grille";
import Pochette from "./Pochette";

function Page({
  page,
  format,
  cases,
  cardsById,
  visuelsById,
  possede,
  dragOverIndice,
  libelle,
  onInserer,
  onSupprimer,
}: {
  page: number;
  format: Format;
  cases: Case[];
  cardsById: Map<string, Carte>;
  visuelsById: Map<string, Visuel>;
  possede: PossedeMap;
  dragOverIndice: number | null;
  libelle: string;
  // Absent sur la page de droite : les boutons d'insertion ne s'affichent
  // qu'une fois par double page.
  onInserer?: (position: number) => void;
  onSupprimer: (page: number) => void;
}) {
  const base = page * parPage(format);
  const { masquees, tuiles } = analyse(cases, format, page);
  let pleines = 0;

  const cellules = [];
  for (let i = 0; i < parPage(format); i++) {
    if (masquees.has(i)) continue;
    const indice = base + i;
    const t = tuiles.get(i) ?? null;
    const entry = cases[indice] ?? null;
    if (entry || t) pleines++;

    const carte = entry && entry.t === "c" ? cardsById.get(entry.id) : undefined;
    const visuel = t ? visuelsById.get(t.e.a) : entry && entry.t === "i" ? visuelsById.get(entry.a) : undefined;
    const poss: Possede | undefined = carte
      ? possede[carte.id] ?? { n: false, r: false, h: false, p: false, m: false }
      : undefined;

    cellules.push(
      <Pochette
        key={indice}
        indice={indice}
        format={format}
        entry={entry}
        tuile={t}
        carte={carte}
        visuel={visuel}
        possede={poss}
        estCible={dragOverIndice === indice}
        numeroPlaceholder={i + 1}
      />
    );
  }

  return (
    <section className="feuille">
      <div className="entete">
        <span>{libelle}</span>
        <span className="entete-actions">
          {onInserer && (
            <>
              <button onClick={() => onInserer(page)} title={`Insérer une page vierge avant la ${libelle.toLowerCase()}`}>
                + avant
              </button>
              <button onClick={() => onInserer(page + 1)} title={`Insérer une page vierge après la ${libelle.toLowerCase()}`}>
                + après
              </button>
            </>
          )}
          <button
            className="entete-supprimer"
            onClick={() => {
              if (pleines && !confirm(`Supprimer la ${libelle.toLowerCase()} et les ${pleines} élément(s) qu'elle contient ?`)) return;
              onSupprimer(page);
            }}
            title={`Supprimer la ${libelle.toLowerCase()}`}
          >
            Supprimer
          </button>
          <span>{`${pleines}/${parPage(format)}`}</span>
        </span>
      </div>
      <div className="grille" style={{ gridTemplateColumns: `repeat(${format},1fr)` }}>
        {cellules}
      </div>
    </section>
  );
}

// Double page n° `s` → indices des pages gauche/droite (null si hors
// classeur). Comme un vrai classeur, la page 1 est par défaut seule à droite,
// face au revers de la couverture ; `premiereDouble` la place à gauche.
function pagesDuSpread(s: number, total: number, premiereDouble: boolean) {
  const gauche = s * 2 - (premiereDouble ? 0 : 1);
  const droite = gauche + 1;
  return {
    gauche: gauche >= 0 && gauche < total ? gauche : null,
    droite: droite < total ? droite : null,
  };
}

function libelleSpread(g: number | null, d: number | null) {
  if (g !== null && d !== null) return `Pages ${g + 1}–${d + 1}`;
  return `Page ${(g ?? d ?? 0) + 1}`;
}

export default function Classeur({
  format,
  cases,
  cardsById,
  visuelsById,
  possede,
  spread,
  onSpreadChange,
  dragOverIndice,
  premiereDouble,
  onPremiereDoubleChange,
  onAjouterPages,
  onInsererPage,
  onSupprimerPage,
}: {
  format: Format;
  cases: Case[];
  cardsById: Map<string, Carte>;
  visuelsById: Map<string, Visuel>;
  possede: PossedeMap;
  spread: number;
  onSpreadChange: (s: number) => void;
  dragOverIndice: number | null;
  premiereDouble: boolean;
  onPremiereDoubleChange: (v: boolean) => void;
  onAjouterPages: () => void;
  onInsererPage: (position: number) => void;
  onSupprimerPage: (page: number) => void;
}) {
  const total = nbPages(cases, format);
  const maxSpread = Math.ceil((total + (premiereDouble ? 0 : 1)) / 2) - 1;
  const spreadClamp = Math.min(Math.max(0, spread), maxSpread);
  const { gauche: g, droite: d } = pagesDuSpread(spreadClamp, total, premiereDouble);

  const communs = { format, cases, cardsById, visuelsById, possede, dragOverIndice, onSupprimer: onSupprimerPage };

  return (
    <main className="scene">
      <nav className="pagination">
        <button disabled={spreadClamp === 0} onClick={() => onSpreadChange(0)} title="Aller au début du classeur">
          « Début
        </button>
        <button disabled={spreadClamp === 0} onClick={() => onSpreadChange(spreadClamp - 1)}>
          Page précédente
        </button>
        <label className="pagination-choix">
          <select
            value={spreadClamp}
            onChange={(e) => onSpreadChange(Number(e.target.value))}
            aria-label="Aller aux pages"
          >
            {Array.from({ length: maxSpread + 1 }, (_, s) => {
              const p = pagesDuSpread(s, total, premiereDouble);
              return (
                <option key={s} value={s}>
                  {libelleSpread(p.gauche, p.droite)}
                </option>
              );
            })}
          </select>
          <span>
            sur <b>{total}</b>
          </span>
        </label>
        <button disabled={spreadClamp >= maxSpread} onClick={() => onSpreadChange(spreadClamp + 1)}>
          Page suivante
        </button>
        <button disabled={spreadClamp >= maxSpread} onClick={() => onSpreadChange(maxSpread)} title="Aller à la fin du classeur">
          Fin »
        </button>
        <button onClick={onAjouterPages}>
          Ajouter une page à la fin
        </button>
        <label className="pagination-option" title="Par défaut, la page 1 est seule à droite, comme dans un vrai classeur">
          <input type="checkbox" checked={premiereDouble} onChange={(e) => onPremiereDoubleChange(e.target.checked)} />
          1re page en double
        </label>
      </nav>
      <div className="classeur">
        {g !== null ? (
          <Page {...communs} page={g} libelle={`Page ${g + 1}`} onInserer={onInsererPage} />
        ) : (
          <section className="feuille couverture" aria-label="Revers de la couverture" />
        )}
        <div className="anneaux" aria-hidden="true">
          <i /><i /><i /><i /><i />
        </div>
        {d !== null ? (
          // Les boutons d'insertion vont sur la première vraie page de la double page.
          <Page {...communs} page={d} libelle={`Page ${d + 1}`} onInserer={g === null ? onInsererPage : undefined} />
        ) : (
          <section className="feuille droite" style={{ visibility: "hidden" }} />
        )}
      </div>
    </main>
  );
}
