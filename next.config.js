/** @type {import('next').NextConfig} */
// On utilise des balises <img> classiques (pas next/image) : les visuels
// viennent d'un CDN externe (tcgdex) et de fichiers déposés par l'utilisateur,
// et l'API d'optimisation d'image de Next comporte une faille de sécurité
// critique connue sur les versions 14.x — inutile de l'activer ici.
const nextConfig = {
  eslint: {
    // Pas de config ESLint installée dans ce projet (hors périmètre de cette
    // conversion) : on évite que `next build` ne s'arrête dessus.
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;
