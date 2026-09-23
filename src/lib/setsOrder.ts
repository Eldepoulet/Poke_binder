import type { SetMeta } from "@/lib/types";

// Ordre chronologique des ères "ligne principale" du JCC Pokémon, du plus
// ancien au plus récent. Couvre 14 des 18 `serieCode` présents dans
// sets-meta.json (les 202 sets) — les 4 restants (pop, tk, mc, tcgp :
// promos POP, kits dresseur, collections McDonald's, Pokémon TCG Pocket)
// n'ont pas de date de sortie disponible dans les données (aucune n'existe :
// ni sur le modèle Set, ni dans sets-meta.json, ni dans l'ordre brut du
// fichier). "pop"/"tk" sont rattachés à l'ère la plus proche par ANCRAGE
// ci-dessous ; "mc" et "tcgp" sont plutôt des collections à part (produits
// dérivés McDonald's, jeu mobile Pokémon TCG Pocket) reléguées tout à la
// fin de la liste via SERIES_SPECIALES, à la demande de l'utilisateur.
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

// Séries reléguées tout à la fin de la liste (après toutes les ères
// chronologiques), dans cet ordre.
const SERIES_SPECIALES = ["mc", "tcgp"] as const;

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
  return "base"; // repli : divers/POP
}

function rangSerie(code: string, serieCode: string | null): number {
  const rangSpecial = serieCode ? (SERIES_SPECIALES as readonly string[]).indexOf(serieCode) : -1;
  // Rangs négatifs = après "base" (rang 0), dans l'ordre de SERIES_SPECIALES.
  if (rangSpecial !== -1) return -1 - rangSpecial;
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
