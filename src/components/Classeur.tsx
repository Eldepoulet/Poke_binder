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
}: {
  page: number;
  format: Format;
  cases: Case[];
  cardsById: Map<string, Carte>;
  visuelsById: Map<string, Visuel>;
  possede: PossedeMap;
  dragOverIndice: number | null;
  libelle: string;
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
        <span>{`${pleines}/${parPage(format)}`}</span>
      </div>
      <div className="grille" style={{ gridTemplateColumns: `repeat(${format},1fr)` }}>
        {cellules}
      </div>
    </section>
  );
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
  onAjouterPages,
}: {
  format: Format;
  cases: Case[];
  cardsById: Map<string, Carte>;
  visuelsById: Map<string, Visuel>;
  possede: PossedeMap;
  spread: number;
  onSpreadChange: (s: number) => void;
  dragOverIndice: number | null;
  onAjouterPages: () => void;
}) {
  const total = nbPages(cases, format);
  const maxSpread = Math.ceil(total / 2) - 1;
  const spreadClamp = Math.min(Math.max(0, spread), maxSpread);
  const g = spreadClamp * 2;
  const d = g + 1;
  const droiteVisible = d < total;

  return (
    <main className="scene">
      <div className="classeur">
        <Page
          page={g}
          format={format}
          cases={cases}
          cardsById={cardsById}
          visuelsById={visuelsById}
          possede={possede}
          dragOverIndice={dragOverIndice}
          libelle={`Page ${g + 1}`}
        />
        <div className="anneaux" aria-hidden="true">
          <i /><i /><i /><i /><i />
        </div>
        {droiteVisible ? (
          <Page
            page={d}
            format={format}
            cases={cases}
            cardsById={cardsById}
            visuelsById={visuelsById}
            possede={possede}
            dragOverIndice={dragOverIndice}
            libelle={`Page ${d + 1}`}
          />
        ) : (
          <section className="feuille droite" style={{ visibility: "hidden" }} />
        )}
      </div>
      <nav className="pagination">
        <button disabled={spreadClamp === 0} onClick={() => onSpreadChange(spreadClamp - 1)}>
          Page précédente
        </button>
        <span>
          Pages <b>{droiteVisible ? `${g + 1}–${d + 1}` : `${g + 1}`}</b> sur <b>{total}</b>
        </span>
        <button disabled={spreadClamp >= maxSpread} onClick={() => onSpreadChange(spreadClamp + 1)}>
          Page suivante
        </button>
        <button onClick={onAjouterPages}>
          Ajouter des pages
        </button>
      </nav>
    </main>
  );
}
