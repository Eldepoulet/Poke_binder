import type { SetMeta } from "@/lib/types";

// Ordre chronologique des ères "ligne principale" du JCC Pokémon, du plus
// ancien au plus récent. Couvre 14 des 18 `serieCode` présents dans
// sets-meta.json (les 202 sets) — les 4 restants (pop, tk, mc, tcgp :
// promos POP, kits dresseur, collections McDonald's, Pokémon TCG Pocket)
// sont rattachés à l'ère la plus proche par ANCRAGE ci-dessous, faute de
// date de sortie disponible dans les données (aucune n'existe : ni sur le
// modèle Set, ni dans sets-meta.json, ni dans l'ordre brut du fichier).
const ORDRE_SERIES = [
  "base",
  "neo",
  "ecard",
  "ex",
  "dp",
  "pl",
  "hgss",
  "col",
  "bw",
  "xy",
  "sm",
  "swsh",
  "sv",
  "me",
] as const;

// Certains codes (kits du dresseur notamment, ex. "tk-hs-g") utilisent une
// abréviation d'ère différente de son `serieCode`/entrée ORDRE_SERIES.
const ALIAS_ANCRAGE: Record<string, string> = { hs: "hgss" };

function ancrageEre(code: string, serieCode: string | null): string {
  if (serieCode && (ORDRE_SERIES as readonly string[]).includes(serieCode)) return serieCode;
  const c = code.toLowerCase();
  const trouve = ORDRE_SERIES.find((e) => c.includes(e));
  if (trouve) return trouve;
  const alias = Object.entries(ALIAS_ANCRAGE).find(([abrege]) => c.includes(abrege));
  if (alias) return alias[1];
  if (serieCode === "tcgp") return "me"; // jeu mobile récent, aucun bloc physique associé
  return "base"; // repli : divers/POP
}

function rangSerie(code: string, serieCode: string | null): number {
  const idx = ORDRE_SERIES.indexOf(ancrageEre(code, serieCode) as (typeof ORDRE_SERIES)[number]);
  return idx === -1 ? 0 : idx;
}

function rangNumero(code: string): number {
  const m = code.match(/(\d+(\.\d+)?)/);
  return m ? parseFloat(m[1]) : 0;
}

// Trie une liste d'extensions par ère (la plus récente d'abord), puis par
// numéro de set décroissant au sein d'une même ère (ex. sv10 avant sv1).
export function trierParSortieDesc(sets: SetMeta[]): SetMeta[] {
  return [...sets].sort((a, b) => {
    const ra = rangSerie(a.code, a.serieCode);
    const rb = rangSerie(b.code, b.serieCode);
    if (ra !== rb) return rb - ra;
    return rangNumero(b.code) - rangNumero(a.code);
  });
}
