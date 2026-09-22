# Classeur Pokémon — version web

Portage du POC HTML/JS (`classeur-pokemon.html`) en application **Next.js 14
(App Router) + React + TypeScript**, avec une vraie base de données
(SQLite via Prisma) à la place du `localStorage` / IndexedDB du navigateur.

Le catalogue couvre les **202 extensions françaises** du jeu (~22 000 cartes,
seedées depuis `prisma/data/*.json`). Plusieurs **classeurs** peuvent
coexister :
- **master set** : toutes les cartes d'une seule extension, rangées
  automatiquement — l'équivalent du classeur unique des versions précédentes ;
- **personnalisé** : classeur libre, cartes piochées dans n'importe quelle
  extension (le tiroir de cartes demande d'abord de choisir une extension —
  indispensable vu la taille du catalogue).

Les fonctionnalités du POC sont conservées à l'identique par ailleurs :
classeur en 2×2, 3×3 ou 4×4, glisser-déposer et sélection au clic, recherche
par pochette, suivi des variantes (normale / reverse / holo), pages composées
avec des visuels personnels (emprise, mode continu/tuile, cadrage), rangement
automatique, export/import JSON.

## Démarrage

```bash
npm install
npx prisma migrate dev   # crée prisma/dev.db et applique le schéma
npm run db:seed          # (fait automatiquement après migrate dev) importe les 202 extensions
npm run dev
```

Ouvrir http://localhost:3000 — liste des classeurs, avec un bouton pour en
créer un nouveau (personnalisé ou master set).

Pour repartir d'une base vierge et re-seedée : `npx prisma migrate reset --force`.

Le catalogue lui-même (`prisma/data/*.json`, `public/cards/*`,
`prisma/sets-meta.json`) est déjà commité dans le projet — `prisma/scripts/import-catalogue.ts`
n'a besoin d'être relancé que si la source externe (dossier `PokeBinder`,
cartes TCGdex) est mise à jour plus tard.

## Architecture

```
prisma/
  schema.prisma        Card, Set, Binder, CardOwnership, Visual (SQLite)
  seed.ts              boucle sur chaque prisma/data/*.json + sets-meta.json
  data/<code>.json      catalogue par extension (202 fichiers)
  sets-meta.json        noms/séries des extensions (généré une fois via l'API TCGdex)
  scripts/
    import-catalogue.ts  import ponctuel depuis une source externe (voir Démarrage)
src/
  app/
    page.tsx            Server Component : liste des classeurs (BinderSwitcher)
    classeur/[id]/page.tsx  Server Component : charge un classeur + ses cartes depuis Prisma
    layout.tsx, globals.css
    api/
      binders/           GET liste / POST création de classeur
      binders/[id]/       GET/PUT état d'un classeur, DELETE
      binders/[id]/export/, .../import/  export/import JSON scopés à un classeur
      cards/              GET catalogue — exige ?set= (ou ?ids= pour résoudre un lot)
      sets/               GET liste des 202 extensions (nom, série, logo)
      visuals/            GET/POST bibliothèque d'images (upload -> public/uploads)
      visuals/[id]/       DELETE (fichier + entrée DB + nettoyage dans tous les classeurs)
  components/
    BinderApp.tsx        composant client racine : état, délégation clic/drag, sauvegarde
    BinderSwitcher.tsx    page d'accueil : liste + création de classeur
    SelecteurExtension.tsx  sélecteur d'extension partagé (recherche + regroupement par série)
    Classeur.tsx, Pochette.tsx, TiroirCartes.tsx, TiroirVisuels.tsx
    FicheCarteDialog.tsx, FicheVisuelDialog.tsx, PickerDialog.tsx, Modal.tsx
  lib/
    grille.ts            logique pure de placement (portée du POC : dimensionner,
                          analyse des tuiles, placer, ranger, changerFormat)
    binders.ts            lecture/écriture des classeurs + ownership global en base
    prisma.ts, types.ts, swr.ts
public/
  cards/<code>/*.webp   visuels basse définition téléchargés (déjà en local, 129/202 extensions)
  uploads/              images personnelles ajoutées par l'utilisateur
```

### Où vit la logique

La logique de grille (calcul des pages, fusion des cases occupées par un
visuel étalé, échange de cartes, rangement par numéro) reste **côté
client**, en TypeScript pur dans `lib/grille.ts` — c'est un portage quasi
direct des fonctions du POC (`dimensionner`, `analyse`, `placer`, `ranger`,
`changerFormat`), réutilisé aussi côté serveur pour ranger automatiquement
un nouveau classeur "master set". Le serveur ne fait que persister le
résultat (`{format, cases, possede}`) dans SQLite : la grille (`cases`) est
stockée en JSON dans `Binder.casesJson`, comme elle l'était dans le
`localStorage` du POC — la différence est qu'elle vit maintenant dans une
vraie base, accessible via API plutôt qu'un `localStorage.setItem`.
Plusieurs `Binder` peuvent exister en parallèle ; les possessions
(`CardOwnership`) et la bibliothèque de visuels (`Visual`) restent globales,
indépendantes du classeur consulté.

La sauvegarde est automatique (debounce de 300 ms après chaque
modification), sans bouton — comme dans le POC.

Un classeur personnalisé ne charge jamais tout le catalogue : le tiroir de
cartes et le picker demandent de choisir une extension (`SelecteurExtension`,
`/api/sets`) puis chargent uniquement ses cartes (`/api/cards?set=`, via
`swr`) — indispensable avec ~22 000 cartes au total. Un classeur "master set"
garde le comportement d'origine (tout le set chargé d'un coup, pas de
sélecteur, il n'y a qu'une extension possible).

### Images

- Les visuels basse définition sont déjà en local dans `public/cards/<code>/`
  pour 129 des 202 extensions (récupérés au préalable via `fetch_tcgdex.py`) :
  le classeur ne dépend pas d'un réseau pour ces vignettes. Les 73 extensions
  restantes (vieilles promos/coffrets français, ex. `2011bw`…`2017sm`, `30th`,
  `tk-xy-*`) n'ont pas de visuel chez TCGdex — leurs cartes s'affichent sans
  image (juste le numéro), sans planter.
- Le rendu haute définition (fiche détaillée) retente le CDN tcgdex, avec
  repli sur le visuel local puis sur le nom/numéro si tout échoue — même
  logique de cascade que le POC (`sourcesCarte`/`imgCarte`).
- Les images personnelles (bibliothèque de visuels) sont de vrais fichiers
  sur le serveur (`public/uploads/`), référencés en base — remplace le
  stockage en Blob IndexedDB du POC, qui ne fonctionnait que dans un seul
  navigateur.

## Notes de sécurité / choix techniques

- **Next 14.2.35** (dernier correctif de la branche 14.x) plutôt que 16 :
  une montée de version majeure en cours de portage aurait ajouté un risque
  de régression disproportionné pour ce projet. Les CVE restantes
  affectent uniquement l'API d'optimisation d'images de `next/image`
  (RCE non authentifiée sur fichiers AVIF) — **cette API n'est jamais
  utilisée ici** : toutes les images passent par de simples balises
  `<img>`. Avant un déploiement public, prévoir une montée vers Next 15/16.
- Base SQLite locale (`prisma/dev.db`), adaptée à un usage mono-poste. Pour
  plusieurs appareils/utilisateurs, changer `datasource db` vers PostgreSQL
  (le schéma Prisma est déjà écrit pour être portable) — cf. roadmap.
- Pas de compte/authentification pour l'instant : une seule collection
  partagée par quiconque ouvre l'application (comme le POC, mono-navigateur
  devenu mono-serveur). `CardOwnership.userId` et `Visual.userId` existent
  déjà dans le schéma pour introduire des comptes sans migration de
  structure plus tard.

## Limites connues de cette conversion

- Les interactions glisser-déposer, les boîtes de dialogue et la
  délégation de clics ont été testées via compilation TypeScript, build de
  production et appels API (curl), mais **pas encore cliquées dans un vrai
  navigateur** dans cet environnement (aucun outil d'automatisation
  navigateur disponible ici). Le code est un portage ligne à ligne de la
  logique du POC — à vérifier manuellement dans le navigateur avant mise en
  usage réel, en particulier le drag & drop tactile/souris et l'ouverture
  des `<dialog>`.
- `next lint` n'est pas configuré (pas de `eslint-config-next` installé) ;
  `next build` l'ignore volontairement (`eslint.ignoreDuringBuilds`).

## Suite (cf. feuille de route du POC)

1. **Comptes** — `userId` déjà prévu dans `Binder`/`CardOwnership`/`Visual` ;
   reste à ajouter l'authentification (NextAuth par ex.) et filtrer les
   requêtes par utilisateur.
2. **Partage** — page de classeur en lecture seule via un lien public.
3. ~~**Multi-extensions**~~ — fait : 202 extensions en base, classeurs
   "master set" (une extension) ou personnalisés (mélange, via
   `SelecteurExtension`).
4. **Analytique** — valeur de collection, cartes manquantes triées par
   coût : nécessite de collecter des relevés de prix dans la durée.
5. **Recherche cross-extensions** — actuellement le tiroir/picker d'un
   classeur personnalisé demandent de choisir une extension avant de
   chercher une carte ; une recherche par nom à travers les 202 extensions
   (sans les charger toutes) demanderait un filtre côté serveur sur `/api/cards`.
