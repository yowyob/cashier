import type { MetadataRoute } from "next";

// Seule la page d'accueil est publique : le reste de la caisse est derrière la connexion.
export default function robots(): MetadataRoute.Robots {
    return {
        rules: { userAgent: "*", allow: ["/welcome"], disallow: "/" },
    };
}
