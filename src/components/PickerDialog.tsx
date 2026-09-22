"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/swr";
import type { Carte, TypeClasseur } from "@/lib/types";
import CardImage from "./CardImage";
import SelecteurExtension from "./SelecteurExtension";

const PLAFOND = 60;

export default function PickerDialog({
  type,
  cartesMaster,
  onCartesChargees,
  idsPlaces,
  onChoisir,
  onFermer,
}: {
  type: TypeClasseur;
  cartesMaster?: Carte[];
  onCartesChargees?: (cartes: Carte[]) => void;
  idsPlaces: Set<string>;
  onChoisir: (carteId: string) => void;
  onFermer: () => void;
}) {
  const [extension, setExtension] = useState<string | null>(null);
  const { data: cartesExtension } = useSWR<Carte[]>(
    type === "custom" && extension ? `/api/cards?set=${encodeURIComponent(extension)}` : null,
    fetcher
  );

  useEffect(() => {
    if (cartesExtension) onCartesChargees?.(cartesExtension);
  }, [cartesExtension, onCartesChargees]);

  const cartes = type === "master" ? cartesMaster ?? [] : cartesExtension ?? [];

  const [q, setQ] = useState("");
  const [rarete, setRarete] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const raretes = useMemo(
    () => [...new Set(cartes.map((c) => c.rarete))].filter((v): v is string => !!v).sort((a, b) => a.localeCompare(b, "fr")),
    [cartes]
  );

  const query = q.trim().toLowerCase();
  const trouvees = cartes.filter(
    (c) => (!rarete || c.rarete === rarete) && (!query || (c.nom || "").toLowerCase().includes(query) || c.numero.includes(query))
  );
  const visibles = trouvees.slice(0, PLAFOND);

  if (type === "custom" && !extension) {
    return (
      <div className="picker">
        <div className="tete">
          <p className="vide" style={{ margin: 0 }}>
            Choisis d'abord une extension.
          </p>
          <button className="outil" onClick={onFermer}>
            Fermer
          </button>
        </div>
        <SelecteurExtension onChoisir={setExtension} />
      </div>
    );
  }

  return (
    <div className="picker">
      <div className="tete">
        <input
          ref={inputRef}
          className="champ"
          type="search"
          placeholder="Nom ou numéro de carte"
          autoComplete="off"
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && visibles.length) {
              e.preventDefault();
              onChoisir(visibles[0].id);
            }
          }}
        />
        <select value={rarete} onChange={(e) => setRarete(e.target.value)}>
          <option value="">Toutes raretés</option>
          {raretes.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        {type === "custom" && (
          <button className="outil" onClick={() => setExtension(null)}>
            Changer d'extension
          </button>
        )}
        <button className="outil" onClick={onFermer}>
          Fermer
        </button>
      </div>
      <p className="compte">
        {trouvees.length > PLAFOND
          ? `${trouvees.length} cartes trouvées, les ${PLAFOND} premières sont affichées — affine la recherche.`
          : `${trouvees.length} carte${trouvees.length > 1 ? "s" : ""} trouvée${trouvees.length > 1 ? "s" : ""}`}
      </p>
      <div className="resultats">
        {!trouvees.length && <p className="vide">Aucune carte ne correspond.</p>}
        {visibles.map((c) => (
          <button
            key={c.id}
            className={`trouvee${idsPlaces.has(c.id) ? " rangee" : ""}`}
            title={`${c.nom} — n° ${c.numero}${c.rarete ? " · " + c.rarete : ""}`}
            onClick={() => onChoisir(c.id)}
          >
            <CardImage carte={c} />
            <span className="num">{c.numero}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
