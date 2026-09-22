// Types partagés entre l'API et le client. Reflètent fidèlement les
// structures de données du POC (etat.cases, carte, visuel) pour garder
// la logique de placement/rendu quasi identique côté client.

export type Carte = {
  id: string;
  set: string;
  numero: string;
  nom: string;
  rarete: string | null;
  categorie: string | null;
  illustrateur: string | null;
  hp: number | null;
  varNormal: boolean;
  varReverse: boolean;
  varHolo: boolean;
  varReversePokeball: boolean;
  varReverseMasterball: boolean;
  imageLocal: string | null;
  imageUrl: string | null;
  imageLow: string | null;
};

export type Visuel = {
  id: string;
  nom: string;
  path: string;
  mimeType: string;
  createdAt: string;
};

// n/r/h : normale/reverse/holo classiques. p/m : reverse à motif spécial
// Poké Ball / Master Ball (151, Évolutions Prismatiques, Foudre Noire,
// Flamme Blanche...) — n'existent que pour les cartes concernées
// (Carte.varReversePokeball/varReverseMasterball).
export type Possede = { n: boolean; r: boolean; h: boolean; p: boolean; m: boolean };
export type PossedeMap = Record<string, Possede>;

// Quantités possédées par variante (toutes sources confondues : cases
// cochées dans le classeur + imports). Séparé de PossedeMap (booléen,
// utilisé par le classeur existant) — sert à la vue Collection.
export type Quantites = { n: number; r: number; h: number; p: number; m: number };
export type QuantiteMap = Record<string, Quantites>;

export type ImportResume = {
  importees: number;
  setsNotFound: string[];
  cardsNotFound: { serie: string; numero: string; nom: string }[];
  skippedSpecial: number;
};

// `variante` : présent uniquement pour un classeur master set créé en mode
// "Normale + Reverse" — désigne quelle copie (n/r/h/p/m) occupe cette case
// précise (cf. lib/grille.ts, ranger). Absent = comportement historique,
// une case = une carte, toutes ses variantes possédées affichées ensemble.
export type CaseCarte = { t: "c"; id: string; variante?: "n" | "r" | "h" | "p" | "m" };
export type CaseVisuel = {
  t: "i";
  a: string; // id du visuel
  w: number;
  h: number;
  mode: "continu" | "tuile";
  x: number; // 0-100
  y: number; // 0-100
};
export type Case = CaseCarte | CaseVisuel | null;

export type Format = 2 | 3 | 4;

export type TypeClasseur = "custom" | "master";

// Résumé d'un classeur pour les listes (sélecteur, page d'accueil) — sans
// le contenu des cases, potentiellement volumineux.
export type ClasseurResume = {
  id: string;
  nom: string; // nom saisi (custom) ou nom de l'extension (master)
  type: TypeClasseur;
  set: string | null;
  updatedAt: string;
};

export type BinderState = {
  id: string;
  nom: string;
  type: TypeClasseur;
  set: string | null;
  variantes: "normale" | "normale_reverse";
  format: Format;
  cases: Case[];
};

export type SetMeta = {
  code: string;
  name: string;
  serieCode: string | null;
  serieName: string | null;
  logo: string | null;
  symbol: string | null;
  cardCount: number | null;
};

export type ExportPayload = {
  binderId: string;
  format: Format;
  cases: Case[];
  possede: PossedeMap;
  images: { id: string; nom: string; type: string; data: string }[];
  version: 3;
};
