import { auth } from "@/auth";

// Le middleware protège déjà toutes les routes/pages sauf /login et
// /api/auth/*, donc une session devrait toujours être présente ici — cette
// erreur ne sert que de garde-fou si une route oublie un jour cette
// protection.
export async function getUserId(): Promise<string> {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) throw new Error("Non authentifié");
  return email;
}
