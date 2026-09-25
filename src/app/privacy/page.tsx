import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Politique de confidentialité — Classeur Pokémon",
  description: "Quelles données le Classeur Pokémon collecte, pourquoi, où elles sont stockées et comment les supprimer.",
};

const MAJ = "23 septembre 2026";

export default function PrivacyPage() {
  return (
    <main className="accueil legal">
      <Link className="accueil-retour" href="/about">
        ← Présentation
      </Link>

      <h1>Politique de confidentialité</h1>
      <p className="legal-maj">Dernière mise à jour : {MAJ}</p>

      <section>
        <h2>Responsable du traitement</h2>
        <p>
          Ce site est un projet personnel, sans finalité commerciale, édité par{" "}
          <strong>Elvin</strong>. Pour toute question ou demande
          concernant tes données, écris à <strong>elvin.cha08@gmail.com</strong>.
        </p>
      </section>

      <section>
        <h2>Données collectées</h2>
        <p>La connexion se fait via Google (scopes <code>email</code> et <code>profile</code>). Sont collectés :</p>
        <ul>
          <li>
            <strong>Ton adresse e-mail Google</strong>, transmise par Google lors de la connexion. Elle
            sert d&apos;identifiant de compte : c&apos;est la seule donnée d&apos;identité conservée en base.
          </li>
          <li>
            <strong>Ton nom et ta photo de profil Google</strong>, présents dans le cookie de session
            afin d&apos;afficher qui est connecté. Ils ne sont pas enregistrés en base de données.
          </li>
          <li>
            <strong>Le contenu que tu crées</strong> : tes classeurs et leur mise en page, les cartes que
            tu déclares posséder, et les images que tu téléverses toi-même.
          </li>
        </ul>
        <p>
          Aucun cookie publicitaire, aucun traceur analytique, aucun profilage. Le seul cookie déposé est
          celui qui maintient ta session ouverte.
        </p>
      </section>

      <section>
        <h2>Finalité</h2>
        <p>
          Ton adresse e-mail sert exclusivement à rattacher tes classeurs, ta collection et tes images à
          ton compte, et à garantir qu&apos;aucun autre utilisateur n&apos;y accède. Elle n&apos;est utilisée
          pour rien d&apos;autre : pas d&apos;envoi d&apos;e-mails, pas de démarchage, pas de partage à des fins
          commerciales.
        </p>
      </section>

      <section>
        <h2>Hébergement et sous-traitants</h2>
        <ul>
          <li><strong>Google</strong> — authentification (OAuth).</li>
          <li><strong>Vercel</strong> — hébergement du site et stockage des images que tu téléverses.</li>
          <li><strong>Neon</strong> — base de données PostgreSQL hébergée dans l&apos;Union européenne.</li>
          <li><strong>Cloudflare</strong> — diffusion des visuels de cartes (contenu public, sans donnée personnelle).</li>
        </ul>
        <p>
          Ces prestataires interviennent uniquement pour faire fonctionner le service. Tes données ne sont
          ni vendues, ni louées, ni transmises à un tiers à d&apos;autres fins.
        </p>
      </section>

      <section>
        <h2>Conservation et suppression</h2>
        <p>
          Tes données sont conservées tant que ton compte existe. Tu peux demander à tout moment la
          suppression de ton compte et de l&apos;intégralité des données associées (classeurs, collection,
          images) en écrivant à l&apos;adresse de contact ci-dessus : la suppression est définitive et
          effectuée sous 30 jours.
        </p>
        <p>
          La page <Link href="/collection">Collection</Link> te permet par ailleurs de réinitialiser toi-même,
          à tout moment, l&apos;ensemble des cartes que tu as déclaré posséder.
        </p>
      </section>

      <section>
        <h2>Tes droits</h2>
        <p>
          Conformément au RGPD, tu disposes d&apos;un droit d&apos;accès, de rectification, de suppression et de
          portabilité de tes données. La fonction d&apos;export disponible sur chaque classeur te permet déjà
          d&apos;en récupérer le contenu dans un fichier. Pour toute autre demande, utilise l&apos;adresse de
          contact ci-dessus.
        </p>
      </section>
    </main>
  );
}
