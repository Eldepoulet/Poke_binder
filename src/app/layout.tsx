import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import { auth, signOut } from "@/auth";

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-outfit",
});

export const metadata: Metadata = {
  title: "Classeur Pokémon",
  description: "Classeur numérique de cartes Pokémon : composer des pages, suivre sa collection.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  return (
    <html lang="fr" className={outfit.variable}>
      <body>
        {session?.user && (
          <div className="deconnexion">
            <span className="deconnexion-email">{session.user.email}</span>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/login" });
              }}
            >
              <button type="submit">Se déconnecter</button>
            </form>
          </div>
        )}
        {children}
      </body>
    </html>
  );
}
