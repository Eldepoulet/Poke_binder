"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/swr";
import type { Carte, PossedeMap, SetMeta, TypeClasseur } from "@/lib/types";
import CardImage from "./CardImage";
import SelecteurExtension from "./SelecteurExtension";

export type Selection = { t: "c"; id: string } | { t: "i"; a: string } | null;

const possedeUne = (p: PossedeMap, id: string) => {
  const v = p[id];
  return !!v && (v.n || v.r || v.h);
};

export default function TiroirCartes({
  actif,
  type,
  cartesMaster,
  onCartesChargees,
  possede,
  idsPlaces,
  selection,
}: {
  actif: boolean;
  type: TypeClasseur;
  cartesMaster?: Carte[];
  onCartesChargees?: (cartes: Carte[]) => void;
  possede: PossedeMap;
  idsPlaces: Set<string>;
  selection: Selection;
}) {
  // Classeur personnalisé : il faut d'abord choisir une extension — le
  // catalogue entier (~22 000 cartes, 202 extensions) ne peut pas être
  // listé d'un coup.
  const [extension, setExtension] = useState<string | null>(null);
  const [choixOuvert, setChoixOuvert] = useState(true);

  const { data: sets } = useSWR<SetMeta[]>(type === "custom" ? "/api/sets" : null, fetcher);
  const { data: cartesExtension } = useSWR<Carte[]>(
    type === "custom" && extension ? `/api/cards?set=${encodeURIComponent(extension)}` : null,
    fetcher
  );

  useEffect(() => {
    if (cartesExtension) onCartesChargees?.(cartesExtension);
  }, [cartesExtension, onCartesChargees]);

  const cartes = type === "master" ? cartesMaster ?? [] : cartesExtension ?? [];
  const nomExtension = useMemo(() => sets?.find((s) => s.code === extension)?.name ?? extension, [sets, extension]);

  const [recherche, setRecherche] = useState("");
  const [rarete, setRarete] = useState("");
  const [categorie, setCategorie] = useState("");
  const [nonRangees, setNonRangees] = useState(false);
  const [possedees, setPossedees] = useState(false);
  const [manquantes, setManquantes] = useState(false);

  const raretes = useMemo(
    () => [...new Set(cartes.map((c) => c.rarete))].filter((v): v is string => !!v).sort((a, b) => a.localeCompare(b, "fr")),
    [cartes]
  );
  const categories = useMemo(
    () => [...new Set(cartes.map((c) => c.categorie))].filter((v): v is string => !!v).sort((a, b) => a.localeCompare(b, "fr")),
    [cartes]
  );

  const q = recherche.trim().toLowerCase();
  const liste = cartes.filter((c) => {
    if (q && !(c.nom || "").toLowerCase().includes(q) && !c.numero.includes(q)) return false;
    if (rarete && c.rarete !== rarete) return false;
    if (categorie && c.categorie !== categorie) return false;
    if (nonRangees && idsPlaces.has(c.id)) return false;
    if (possedees && !possedeUne(possede, c.id)) return false;
    if (manquantes && possedeUne(possede, c.id)) return false;
    return true;
  });

  const pretAafficher = type === "master" || (!!extension && !choixOuvert);

  return (
    <section className="panneau" id="panCartes" data-actif={actif}>
      <header>
        {type === "custom" && (
          <div className="tiroir-extension">
            {extension && !choixOuvert ? (
              <button type="button" className="ext-actuelle" onClick={() => setChoixOuvert(true)}>
                <b>{nomExtension}</b>
                <span>changer</span>
              </button>
            ) : (
              <SelecteurExtension
                valeurActuelle={extension}
                onChoisir={(code) => {
                  setExtension(code);
                  setChoixOuvert(false);
                }}
              />
            )}
          </div>
        )}

        {pretAafficher && (
          <>
            <input
              className="champ"
              type="search"
              placeholder="Nom ou numéro"
              autoComplete="off"
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
            />
            <div className="duo">
              <select value={rarete} onChange={(e) => setRarete(e.target.value)}>
                <option value="">Toutes raretés</option>
                {raretes.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
              <select value={categorie} onChange={(e) => setCategorie(e.target.value)}>
                <option value="">Toutes catégories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="bascules">
              <button className="bascule" aria-pressed={nonRangees} onClick={() => setNonRangees((v) => !v)}>
                Non rangées
              </button>
              <button
                className="bascule"
                aria-pressed={possedees}
                onClick={() => {
                  setPossedees((v) => !v);
                  if (!possedees) setManquantes(false);
                }}
              >
                Possédées
              </button>
              <button
                className="bascule"
                aria-pressed={manquantes}
                onClick={() => {
                  setManquantes((v) => !v);
                  if (!manquantes) setPossedees(false);
                }}
              >
                Manquantes
              </button>
            </div>
            <div className="compte">
              {liste.length} carte{liste.length > 1 ? "s" : ""} affichée{liste.length > 1 ? "s" : ""}
            </div>
          </>
        )}
      </header>
      <div className="vrac">
        {type === "custom" && !extension && (
          <p className="vide">Choisis une extension ci-dessus pour piocher des cartes.</p>
        )}
        {pretAafficher && !liste.length && (
          <p className="vide">Aucune carte ne correspond. Assouplis la recherche ou les filtres.</p>
        )}
        {pretAafficher &&
          liste.map((c) => {
            const classes = ["vignette"];
            if (idsPlaces.has(c.id)) classes.push("rangee");
            if (selection && selection.t === "c" && selection.id === c.id) classes.push("sel");
            return (
              <button
                key={c.id}
                className={classes.join(" ")}
                draggable
                data-id={c.id}
                title={`${c.nom} — n° ${c.numero}`}
              >
                <CardImage carte={c} />
                <span className="num">{c.numero}</span>
                {possedeUne(possede, c.id) && <span className="pip" />}
              </button>
            );
          })}
      </div>
    </section>
  );
}
