import Link from "next/link";
import type { Metadata } from "next";

// Page d'accueil publique déclarée dans l'écran de consentement Google
// (« Domaine de l'application ») : elle doit décrire l'application et pointer
// vers la politique de confidentialité, sans exiger de connexion.
export const metadata: Metadata = {
  title: "Classeur Pokémon — Présentation",
  description:
    "Suis ta collection de cartes Pokémon extension par extension et compose les pages de tes classeurs.",
};

export default function AboutPage() {
  return (
    <main className="accueil legal">
      <h1>Classeur Pokémon</h1>
      <p>
        Classeur Pokémon est une application web gratuite, sans publicité, pour gérer ta collection de
        cartes Pokémon et préparer la mise en page de tes classeurs.
      </p>

      <section>
        <h2>Ce que tu peux faire</h2>
        <ul>
          <li>
            <strong>Suivre ta collection</strong> extension par extension, variante par variante (normale,
            reverse, holo, reverse Poké Ball, reverse Master Ball), avec ton avancement pour chaque set.
          </li>
          <li>
            <strong>Composer tes classeurs</strong> page par page : place tes cartes dans les pochettes,
            repère d&apos;un coup d&apos;œil celles qui te manquent, ajoute tes propres visuels.
          </li>
          <li>
            <strong>Exporter et importer</strong> tes classeurs dans un fichier pour les sauvegarder.
          </li>
        </ul>
      </section>

      <section>
        <h2>Connexion avec Google</h2>
        <p>
          La connexion se fait avec ton compte Google. L&apos;application n&apos;utilise que ton adresse e-mail
          (pour rattacher ta collection et tes classeurs à ton compte) ainsi que ton nom et ta photo de
          profil (pour afficher qui est connecté). Elle n&apos;accède à aucune autre donnée de ton compte
          Google. Le détail figure dans la <Link href="/privacy">politique de confidentialité</Link>.
        </p>
      </section>

      <section>
        <p>
          <Link href="/login">Se connecter</Link> · <Link href="/privacy">Politique de confidentialité</Link> ·{" "}
          <Link href="/terms">Conditions d&apos;utilisation</Link>
        </p>
        <p className="legal-maj">
          Projet personnel non officiel, sans lien avec Nintendo, Creatures, Game Freak ou The Pokémon
          Company. Pokémon et les noms associés sont des marques de leurs détenteurs respectifs.
        </p>
      </section>
    </main>
  );
}
