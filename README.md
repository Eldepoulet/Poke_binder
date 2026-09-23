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

### Login Google (multi-utilisateurs)

L'application est protégée par un login Google : n'importe quel compte
Google peut se connecter, et **chacun obtient sa propre collection**
(classeurs, cartes cochées, visuels) — il n'y a plus de collection
partagée (voir "Notes de sécurité" ci-dessous).

1. Sur [console.cloud.google.com](https://console.cloud.google.com), créer/sélectionner un projet.
2. Configurer l'écran de consentement OAuth (type **External**) :
   - Pour un usage restreint à quelques personnes connues (famille/amis) :
     laisser en mode **Testing** et ajouter chaque personne comme
     utilisateur de test (jusqu'à 100).
   - Pour ouvrir l'accès à n'importe quel compte Google sans les ajouter un
     par un : passer le statut de publication en **In production** (pas de
     vérification Google nécessaire pour les scopes basiques email/profil
     utilisés ici, mais un écran "application non validée" peut s'afficher).
3. Créer un identifiant **OAuth Client ID** (type **Web application**).
4. Ajouter l'URI de redirection autorisée : `http://localhost:3000/api/auth/callback/google`.
5. Copier le Client ID / Client Secret générés dans `.env` :

   ```bash
   AUTH_GOOGLE_ID="..."
   AUTH_GOOGLE_SECRET="..."
   AUTH_SECRET="..."           # généré via `npx auth secret`
   ```

Sans ces variables renseignées, personne ne peut se connecter.

**Pièges connus :**
- Si le port 3000 est déjà occupé, Next.js bascule sur 3001 (ou un autre) —
  Google refuse alors la connexion avec `redirect_uri_mismatch`. Solution :
  ajouter aussi `http://localhost:3001/api/auth/callback/google` (ou le bon
  port) dans les URI de redirection autorisées du client OAuth, ou libérer
  le port 3000 avant de lancer `npm run dev`.
- `npx auth secret` peut générer une variable nommée `BETTER_AUTH_SECRET`
  selon le paquet résolu par npx — renommer en `AUTH_SECRET` dans `.env`,
  c'est le nom que next-auth lit automatiquement.

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
Plusieurs `Binder` peuvent exister en parallèle ; pour un même compte, les
possessions (`CollectionEntry`) et la bibliothèque de visuels (`Visual`)
restent globales entre ses propres classeurs, indépendamment de celui
consulté — mais toujours scopées à ce compte (`userId`), jamais partagées
entre utilisateurs différents.

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
- **Login Google multi-utilisateurs** (Auth.js v5 / `next-auth@beta`,
  `src/auth.ts`) : n'importe quel compte Google peut se connecter, via
  `src/middleware.ts` qui protège toutes les pages et routes API sauf
  `/login`. `userId` (l'email du compte Google, cf. `src/lib/current-user.ts`)
  est maintenant obligatoire et réellement utilisé pour scoper `Binder`,
  `CollectionEntry` et `Visual` — chaque utilisateur ne voit et ne modifie
  que ses propres données (vérifié via `findFirst`/`updateMany`/`deleteMany`
  filtrés par `userId`, jamais par `id` seul). Session en JWT, pas d'adapter
  Prisma ni de table utilisateur séparée : l'email fait office d'identifiant
  stable. Les anciennes données de l'ère mono-collection (`userId="local"`)
  restent en base mais sont désormais orphelines — aucun compte réel ne
  peut plus y accéder.

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
