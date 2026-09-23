import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    // Ouvert à n'importe quel compte Google (chacun obtient sa propre
    // collection, cf. src/lib/current-user.ts) — on exige juste un email
    // vérifié par Google, pas de liste blanche.
    async signIn({ profile }) {
      return Boolean(profile?.email && profile?.email_verified);
    },
    authorized({ auth }) {
      return Boolean(auth?.user);
    },
  },
});
