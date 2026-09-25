import Link from "next/link";
import { signIn } from "@/auth";

export default function LoginPage() {
  return (
    <main className="connexion">
      <div className="connexion-carte">
        <h1>Classeur Pokémon</h1>
        <p>Connecte-toi avec ton compte Google pour accéder à ta collection personnelle.</p>
        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/" });
          }}
        >
          <button className="bouton-google" type="submit">
            Se connecter avec Google
          </button>
        </form>
        <nav className="connexion-liens">
          <Link href="/about">À propos</Link>
          <Link href="/privacy">Confidentialité</Link>
          <Link href="/terms">Conditions</Link>
        </nav>
      </div>
    </main>
  );
}
