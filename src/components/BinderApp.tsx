"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Carte, Case, CaseVisuel, ExportPayload, Format, PossedeMap, TypeClasseur, Visuel } from "@/lib/types";
import {
  ajouterPages,
  changerFormat,
  dimensionner,
  libererZone,
  placer,
  ranger,
  type Charge,
} from "@/lib/grille";
import Topbar from "./Topbar";
import TiroirCartes, { type Selection } from "./TiroirCartes";
import TiroirVisuels from "./TiroirVisuels";
import Classeur from "./Classeur";
import Modal from "./Modal";
import FicheCarteDialog from "./FicheCarteDialog";
import FicheVisuelDialog from "./FicheVisuelDialog";
import PickerDialog from "./PickerDialog";

type DialogState =
  | { type: "fiche-carte"; indice: number }
  | { type: "fiche-visuel"; indice: number }
  | { type: "picker"; indice: number }
  | null;

type BinderInfo = {
  id: string;
  nom: string;
  type: TypeClasseur;
  set: string | null;
};

export default function BinderApp({
  binder,
  cartesInitiales,
  visuelsInitiaux,
  formatInitial,
  casesInitiales,
  possedeInitial,
}: {
  binder: BinderInfo;
  cartesInitiales: Carte[];
  visuelsInitiaux: Visuel[];
  formatInitial: Format;
  casesInitiales: Case[];
  possedeInitial: PossedeMap;
}) {
  const [format, setFormat] = useState<Format>(formatInitial);
  const [cases, setCases] = useState<Case[]>(() => dimensionner(casesInitiales, formatInitial));
  const [possede, setPossede] = useState<PossedeMap>(possedeInitial);
  const [visuels, setVisuels] = useState<Visuel[]>(visuelsInitiaux);

  // Catalogue des cartes connues (nécessaires au rendu du classeur). Pour un
  // classeur "master", c'est fixe (toute l'extension). Pour un classeur
  // "custom", ça grandit au fil des extensions parcourues dans le tiroir/le
  // picker — d'où un vrai state fusionnable plutôt qu'un simple useMemo sur
  // "tout le catalogue" (qui n'existe plus comme notion côté client).
  const [cardsById, setCardsById] = useState<Map<string, Carte>>(
    () => new Map(cartesInitiales.map((c) => [c.id, c]))
  );
  const mergerCartes = useCallback((nouvelles: Carte[]) => {
    setCardsById((prev) => {
      let changed = false;
      const next = new Map(prev);
      for (const c of nouvelles) {
        if (!next.has(c.id)) {
          next.set(c.id, c);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, []);

  const [spread, setSpread] = useState(0);
  const [onglet, setOnglet] = useState<"cartes" | "visuels">("cartes");
  const [selection, setSelection] = useState<Selection>(null);
  const [dialog, setDialog] = useState<DialogState>(null);
  const [dragOverIndice, setDragOverIndice] = useState<number | null>(null);
  const [depotActif, setDepotActif] = useState(false);

  const porte = useRef<Charge | null>(null);
  const premierRendu = useRef(true);

  const visuelsById = useMemo(() => new Map(visuels.map((v) => [v.id, v])), [visuels]);
  const idsPlaces = useMemo(
    () => new Set(cases.filter((c): c is Extract<Case, { t: "c" }> => !!c && c.t === "c").map((c) => c.id)),
    [cases]
  );

  // Le pool "de ce classeur" : toute l'extension pour un master, seulement
  // les cartes déjà placées pour un classeur personnalisé (qui n'a pas de
  // catalogue fixe). Sert à la fois à la jauge de collection et au
  // rangement automatique par numéro.
  const cartesDuClasseur =
    binder.type === "master" ? cartesInitiales : [...cardsById.values()].filter((c) => idsPlaces.has(c.id));
  const compteur = cartesDuClasseur.filter((c) => {
    const p = possede[c.id];
    return p && (p.n || p.r || p.h);
  }).length;
  const total = cartesDuClasseur.length;

  const sousTitre =
    binder.type === "master"
      ? `${total} cartes · français · ${binder.set}`
      : `Classeur personnalisé · ${idsPlaces.size} carte${idsPlaces.size > 1 ? "s" : ""} placée${idsPlaces.size > 1 ? "s" : ""}`;

  // Persistance de la disposition (format + cases) : envoyée au serveur sans
  // bouton à actionner (comme le localStorage du POC, mais dans une vraie
  // base). La possession (`possede`) est persistée à part, immédiatement, via
  // alternerVariante ci-dessous — elle ne fait plus partie de cette
  // sauvegarde debounced (cf. src/lib/ownership.ts).
  useEffect(() => {
    if (premierRendu.current) {
      premierRendu.current = false;
      return;
    }
    const t = setTimeout(() => {
      fetch(`/api/binders/${binder.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format, cases }),
      }).catch(() => {});
    }, 300);
    return () => clearTimeout(t);
  }, [binder.id, format, cases]);

  useEffect(() => {
    function surClavier(e: KeyboardEvent) {
      const cible = e.target as HTMLElement;
      if (cible.matches("input,select,textarea")) return;
      if (e.key === "ArrowLeft") setSpread((s) => Math.max(0, s - 1));
      if (e.key === "ArrowRight") setSpread((s) => s + 1);
      if (e.key === "Escape") setSelection(null);
    }
    document.addEventListener("keydown", surClavier);
    return () => document.removeEventListener("keydown", surClavier);
  }, []);

  function placerCase(indice: number, charge: Charge) {
    setCases((prev) => placer(dimensionner(prev, format), format, indice, charge));
  }

  function ajusterVisuel(indice: number, patch: Partial<CaseVisuel>) {
    setCases((prev) => {
      const courant = prev[indice];
      if (!courant || courant.t !== "i") return prev;
      const misAJour: CaseVisuel = { ...courant, ...patch };
      let next = [...prev];
      next[indice] = misAJour;
      if ("w" in patch || "h" in patch) {
        next = libererZone(next, format, indice, misAJour.w, misAJour.h);
      }
      return next;
    });
  }

  function rangerAuto() {
    setCases((prev) => ranger(dimensionner(prev, format), format, cartesDuClasseur));
  }

  function viderClasseur() {
    if (!confirm("Vider toutes les pages ? Les variantes cochées et la bibliothèque d'images sont conservées.")) return;
    setCases((prev) => prev.map(() => null));
  }

  function changerFormatHandler(f: Format) {
    setCases((prev) => changerFormat(dimensionner(prev, format), f));
    setFormat(f);
    setSpread(0);
  }

  function ajouterPagesHandler() {
    setCases((prev) => ajouterPages(dimensionner(prev, format), format));
  }

  function alternerVariante(carteId: string, cle: "n" | "r" | "h", val: boolean) {
    setPossede((prev) => {
      const p = { ...(prev[carteId] ?? { n: false, r: false, h: false }), [cle]: val };
      const next = { ...prev };
      if (!p.n && !p.r && !p.h) delete next[carteId];
      else next[carteId] = p;
      return next;
    });
    fetch("/api/ownership", {
      method: val ? "POST" : "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cardId: carteId, variante: cle }),
    }).catch(() => {});
  }

  async function importerFichiers(fichiers: FileList): Promise<string | null> {
    const images = [...fichiers].filter((f) => f.type.startsWith("image/"));
    if (!images.length) return null;
    const form = new FormData();
    images.forEach((f) => form.append("fichiers", f));
    const res = await fetch("/api/visuals", { method: "POST", body: form });
    if (!res.ok) return null;
    const crees: Visuel[] = await res.json();
    if (!crees.length) return null;
    setVisuels((prev) => [...prev, ...crees]);
    return crees[crees.length - 1].id;
  }

  async function supprimerVisuel(id: string) {
    setDialog((d) => {
      if (d && d.type === "fiche-visuel") {
        const entry = cases[d.indice];
        if (entry && entry.t === "i" && entry.a === id) return null;
      }
      return d;
    });
    setSelection((sel) => (sel && sel.t === "i" && sel.a === id ? null : sel));
    setVisuels((prev) => prev.filter((v) => v.id !== id));
    setCases((prev) => prev.map((c) => (c && c.t === "i" && c.a === id ? null : c)));
    await fetch(`/api/visuals/${id}`, { method: "DELETE" }).catch(() => {});
  }

  async function exporter() {
    const res = await fetch(`/api/binders/${binder.id}/export`);
    if (!res.ok) return;
    const data = await res.json();
    const blob = new Blob([JSON.stringify(data)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `classeur-${binder.nom.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || binder.id}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function importer(fichier: File) {
    try {
      const texte = await fichier.text();
      const donnees = JSON.parse(texte) as ExportPayload;
      const res = await fetch(`/api/binders/${binder.id}/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(donnees),
      });
      if (!res.ok) throw new Error("import refusé");

      const [stateRes, visRes] = await Promise.all([
        fetch(`/api/binders/${binder.id}`),
        fetch("/api/visuals"),
      ]);
      const state = await stateRes.json();
      const vis: Visuel[] = await visRes.json();

      premierRendu.current = true; // l'état vient d'être persisté côté serveur, pas la peine de le renvoyer
      setFormat(state.format);
      setCases(dimensionner(state.cases, state.format));
      setPossede(state.possede);
      setVisuels(vis);
      setSpread(0);
      setSelection(null);
      setDialog(null);
    } catch {
      alert("Fichier illisible. Choisis un export produit par ce classeur.");
    }
  }

  function indiceDepuisElement(el: HTMLElement): number {
    return el.dataset.ancre !== undefined ? Number(el.dataset.ancre) : Number(el.dataset.indice);
  }

  function surClicApp(e: React.MouseEvent) {
    const cible = e.target as HTMLElement;

    const sup = cible.closest("[data-supprimer]") as HTMLElement | null;
    if (sup) {
      e.stopPropagation();
      const id = sup.dataset.supprimer!;
      if (confirm("Supprimer cette image ? Elle sera retirée des pages où elle apparaît.")) supprimerVisuel(id);
      return;
    }

    const vig = cible.closest(".vignette") as HTMLElement | null;
    if (vig) {
      const id = vig.dataset.id!;
      setSelection((sel) => (sel && sel.t === "c" && sel.id === id ? null : { t: "c", id }));
      return;
    }

    const vis = cible.closest(".visuel-item") as HTMLElement | null;
    if (vis) {
      const a = vis.dataset.visuel!;
      setSelection((sel) => (sel && sel.t === "i" && sel.a === a ? null : { t: "i", a }));
      return;
    }

    const poc = cible.closest(".pochette") as HTMLElement | null;
    if (poc) {
      const indice = indiceDepuisElement(poc);
      if (selection) {
        placerCase(indice, selection.t === "c" ? { t: "c", id: selection.id } : { t: "i", a: selection.a });
        setSelection(null);
        return;
      }
      const contenu = cases[indice] ?? null;
      if (!contenu) {
        setDialog({ type: "picker", indice });
        return;
      }
      setDialog(contenu.t === "c" ? { type: "fiche-carte", indice } : { type: "fiche-visuel", indice });
    }
  }

  function surDragStartApp(e: React.DragEvent) {
    const cible = e.target as HTMLElement;
    const vig = cible.closest(".vignette") as HTMLElement | null;
    const vis = cible.closest(".visuel-item") as HTMLElement | null;
    const poc = cible.closest(".pochette") as HTMLElement | null;

    if (vig) {
      porte.current = { t: "c", id: vig.dataset.id! };
    } else if (vis) {
      porte.current = { t: "i", a: vis.dataset.visuel! };
    } else if (poc) {
      const indice = indiceDepuisElement(poc);
      const contenu = cases[indice];
      if (!contenu) return;
      porte.current = contenu.t === "c" ? { t: "c", id: contenu.id } : { ...contenu, depuis: indice };
    } else {
      return;
    }
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", "");
  }

  function surDragEndApp() {
    porte.current = null;
    setDragOverIndice(null);
    setDepotActif(false);
  }

  function surDragOverApp(e: React.DragEvent) {
    const cible = e.target as HTMLElement;
    if (cible.closest("#depot")) {
      e.preventDefault();
      setDepotActif(true);
      return;
    }
    const poc = cible.closest(".pochette") as HTMLElement | null;
    if (!poc) return;
    if (!porte.current && ![...e.dataTransfer.types].includes("Files")) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    setDragOverIndice(indiceDepuisElement(poc));
  }

  function surDragLeaveApp(e: React.DragEvent) {
    const cible = e.target as HTMLElement;
    if (cible.closest(".pochette")) setDragOverIndice(null);
    if (cible.closest("#depot")) setDepotActif(false);
  }

  async function surDropApp(e: React.DragEvent) {
    const cible = e.target as HTMLElement;
    const dep = cible.closest("#depot");
    const poc = cible.closest(".pochette") as HTMLElement | null;

    if (dep) {
      e.preventDefault();
      setDepotActif(false);
      if (e.dataTransfer.files?.length) await importerFichiers(e.dataTransfer.files);
      return;
    }
    if (!poc) return;
    e.preventDefault();
    setDragOverIndice(null);
    const indice = indiceDepuisElement(poc);

    if (e.dataTransfer.files?.length) {
      const id = await importerFichiers(e.dataTransfer.files);
      if (id) placerCase(indice, { t: "i", a: id });
      return;
    }
    if (porte.current) placerCase(indice, porte.current);
    porte.current = null;
  }

  const dialogFicheCarte = dialog && dialog.type === "fiche-carte" ? dialog : null;
  const ficheCarteData = dialogFicheCarte ? cases[dialogFicheCarte.indice] : null;
  const carteEnFiche =
    ficheCarteData && ficheCarteData.t === "c" ? cardsById.get(ficheCarteData.id) ?? null : null;

  const dialogFicheVisuel = dialog && dialog.type === "fiche-visuel" ? dialog : null;
  const ficheVisuelData = dialogFicheVisuel ? cases[dialogFicheVisuel.indice] : null;
  const visuelEntry = ficheVisuelData && ficheVisuelData.t === "i" ? ficheVisuelData : null;

  const dialogPicker = dialog && dialog.type === "picker" ? dialog : null;

  return (
    <div
      className="app"
      onClick={surClicApp}
      onDragStart={surDragStartApp}
      onDragEnd={surDragEndApp}
      onDragOver={surDragOverApp}
      onDragLeave={surDragLeaveApp}
      onDrop={surDropApp}
    >
      <Topbar
        titre={binder.nom}
        sousTitre={sousTitre}
        compteur={compteur}
        total={total}
        format={format}
        onFormat={changerFormatHandler}
        onRanger={rangerAuto}
        onVider={viderClasseur}
        onExport={exporter}
        onImport={importer}
      />

      <div className="corps">
        <aside className="tiroir">
          <div className="onglets" role="tablist">
            <button role="tab" aria-selected={onglet === "cartes"} onClick={() => setOnglet("cartes")}>
              Cartes
            </button>
            <button role="tab" aria-selected={onglet === "visuels"} onClick={() => setOnglet("visuels")}>
              Visuels
            </button>
          </div>

          <TiroirCartes
            actif={onglet === "cartes"}
            type={binder.type}
            cartesMaster={binder.type === "master" ? cartesInitiales : undefined}
            onCartesChargees={binder.type === "custom" ? mergerCartes : undefined}
            possede={possede}
            idsPlaces={idsPlaces}
            selection={selection}
          />
          <TiroirVisuels
            actif={onglet === "visuels"}
            visuels={visuels}
            selection={selection}
            depotActif={depotActif}
            onImporterFichiers={importerFichiers}
          />
        </aside>

        <Classeur
          format={format}
          cases={cases}
          cardsById={cardsById}
          visuelsById={visuelsById}
          possede={possede}
          spread={spread}
          onSpreadChange={setSpread}
          dragOverIndice={dragOverIndice}
          onAjouterPages={ajouterPagesHandler}
        />
      </div>

      <Modal open={!!dialogFicheCarte && !!carteEnFiche} onRequestClose={() => setDialog(null)}>
        {dialogFicheCarte && carteEnFiche && (
          <FicheCarteDialog
            carte={carteEnFiche}
            possede={possede[carteEnFiche.id] ?? { n: false, r: false, h: false }}
            onToggleVariante={(cle, val) => alternerVariante(carteEnFiche.id, cle, val)}
            onRemplacer={() => setDialog({ type: "picker", indice: dialogFicheCarte.indice })}
            onRetirer={() => {
              const idx = dialogFicheCarte.indice;
              setCases((prev) => {
                const next = [...prev];
                next[idx] = null;
                return next;
              });
              setDialog(null);
            }}
            onFermer={() => setDialog(null)}
          />
        )}
      </Modal>

      <Modal open={!!dialogFicheVisuel && !!visuelEntry} onRequestClose={() => setDialog(null)}>
        {dialogFicheVisuel && visuelEntry && (
          <FicheVisuelDialog
            entry={visuelEntry}
            format={format}
            visuel={visuelsById.get(visuelEntry.a)}
            onChangerTaille={(champ, val) =>
              ajusterVisuel(dialogFicheVisuel.indice, { [champ]: val } as Partial<CaseVisuel>)
            }
            onChangerMode={(mode) => ajusterVisuel(dialogFicheVisuel.indice, { mode })}
            onChangerCadrage={(champ, val) =>
              ajusterVisuel(dialogFicheVisuel.indice, { [champ]: val } as Partial<CaseVisuel>)
            }
            onMettreCarte={() => setDialog({ type: "picker", indice: dialogFicheVisuel.indice })}
            onRetirer={() => {
              const idx = dialogFicheVisuel.indice;
              setCases((prev) => {
                const next = [...prev];
                next[idx] = null;
                return next;
              });
              setDialog(null);
            }}
            onFermer={() => setDialog(null)}
          />
        )}
      </Modal>

      <Modal open={!!dialogPicker} onRequestClose={() => setDialog(null)}>
        {dialogPicker && (
          <PickerDialog
            type={binder.type}
            cartesMaster={binder.type === "master" ? cartesInitiales : undefined}
            onCartesChargees={binder.type === "custom" ? mergerCartes : undefined}
            idsPlaces={idsPlaces}
            onChoisir={(carteId) => {
              placerCase(dialogPicker.indice, { t: "c", id: carteId });
              setDialog(null);
            }}
            onFermer={() => setDialog(null)}
          />
        )}
      </Modal>
    </div>
  );
}
