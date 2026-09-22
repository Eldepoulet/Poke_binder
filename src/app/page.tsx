import Link from "next/link";

export default function Page() {
  return (
    <div className="accueil">
      <h1>Classeur Pokémon</h1>
      <div className="accueil-entrees">
        <Link className="accueil-entree" href="/collection">
          <b>Collection</b>
          <span>Parcourir tes cartes extension par extension, suivre ce que tu possèdes.</span>
        </Link>
        <Link className="accueil-entree" href="/classeurs">
          <b>Mes classeurs</b>
          <span>Composer des pages de classeur, cartes ou visuels personnels.</span>
        </Link>
      </div>
    </div>
  );
}
