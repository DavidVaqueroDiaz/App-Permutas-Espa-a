import type { MetadataRoute } from "next";

/**
 * sitemap.xml generado dinámicamente por Next.js.
 *
 * En esta fase (provisional, antes del MVP funcional) solo
 * incluimos la home. Cuando arranque Fase 1 añadiremos:
 *   - /que-es-una-permuta
 *   - /como-funciona
 *   - /preguntas-frecuentes
 *   - /permutas/[sector] para cada sector
 *   - /buscar
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://permutaes.vercel.app";

  const now = new Date();
  return [
    { url: baseUrl,                         lastModified: now, changeFrequency: "weekly",  priority: 1 },
    { url: `${baseUrl}/registro`,           lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${baseUrl}/login`,              lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${baseUrl}/aviso-legal`,        lastModified: now, changeFrequency: "yearly",  priority: 0.3 },
    { url: `${baseUrl}/politica-privacidad`,lastModified: now, changeFrequency: "yearly",  priority: 0.3 },
    { url: `${baseUrl}/condiciones-uso`,    lastModified: now, changeFrequency: "yearly",  priority: 0.3 },
    { url: `${baseUrl}/politica-cookies`,   lastModified: now, changeFrequency: "yearly",  priority: 0.3 },
  ];
}
