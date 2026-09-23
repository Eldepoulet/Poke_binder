export { auth as middleware } from "@/auth";

export const config = {
  // `privacy` doit rester joignable sans session : Google exige une page de
  // confidentialité publiquement accessible pour publier l'écran de consentement.
  matcher: ["/((?!api/auth|login|privacy|_next/static|_next/image|favicon.ico).*)"],
};
