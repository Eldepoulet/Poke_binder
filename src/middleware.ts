export { auth as middleware } from "@/auth";

export const config = {
  // `about`, `privacy` et `terms` doivent rester joignables sans session :
  // Google exige des pages publiques (accueil, confidentialité, conditions)
  // pour publier l'écran de consentement.
  matcher: ["/((?!api/auth|login|about|privacy|terms|_next/static|_next/image|favicon.ico).*)"],
};
