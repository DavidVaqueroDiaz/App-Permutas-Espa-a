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

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
  ];
}
