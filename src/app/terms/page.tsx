import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Conditions d'utilisation — Classeur Pokémon",
  description: "Règles d'utilisation du Classeur Pokémon.",
};

const MAJ = "25 septembre 2026";

export default function TermsPage() {
  return (
    <main className="accueil legal">
      <Link className="accueil-retour" href="/about">
        ← Présentation
      </Link>

      <h1>Conditions d&apos;utilisation</h1>
      <p className="legal-maj">Dernière mise à jour : {MAJ}</p>

      <section>
        <h2>Le service</h2>
        <p>
          Classeur Pokémon est un projet personnel, gratuit et sans finalité commerciale, édité par{" "}
          <strong>Elvin</strong>. Il permet de suivre sa collection de
          cartes Pokémon et de composer des pages de classeur. En te connectant, tu acceptes les présentes
          conditions.
        </p>
      </section>

      <section>
        <h2>Ton compte</h2>
        <p>
          L&apos;accès se fait avec un compte Google. Tu es responsable de l&apos;usage fait de ton compte.
          Les données que tu crées (classeurs, collection, images) te sont propres et ne sont pas visibles
          par les autres utilisateurs.
        </p>
      </section>

      <section>
        <h2>Contenus que tu téléverses</h2>
        <p>Tu t&apos;engages à ne téléverser que des images :</p>
        <ul>
          <li>que tu as le droit d&apos;utiliser ;</li>
          <li>qui ne sont ni illicites, ni offensantes, ni contraires aux droits d&apos;autrui.</li>
        </ul>
        <p>
          Tout contenu contraire à ces règles peut être supprimé, et le compte concerné fermé.
        </p>
      </section>

      <section>
        <h2>Disponibilité et responsabilité</h2>
        <p>
          Le service est fourni « en l&apos;état », sans garantie de disponibilité continue ni
          d&apos;exactitude des informations sur les cartes. Il peut évoluer, être interrompu ou arrêté à
          tout moment. Pense à utiliser la fonction d&apos;export pour sauvegarder tes classeurs.
        </p>
      </section>

      <section>
        <h2>Propriété intellectuelle</h2>
        <p>
          Projet non officiel, sans lien avec Nintendo, Creatures, Game Freak ou The Pokémon Company.
          Pokémon, les noms et les visuels des cartes sont des marques et contenus de leurs détenteurs
          respectifs, affichés à titre de référence pour les collectionneurs.
        </p>
      </section>

      <section>
        <h2>Données personnelles</h2>
        <p>
          Le traitement de tes données est décrit dans la{" "}
          <Link href="/privacy">politique de confidentialité</Link>.
        </p>
      </section>

      <section>
        <h2>Contact</h2>
        <p>
          Pour toute question : <strong>elvin.cha08@gmail.com</strong>.
        </p>
      </section>
    </main>
  );
}
