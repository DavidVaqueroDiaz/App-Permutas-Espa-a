import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site-url";

/**
 * sitemap.xml generado dinámicamente por Next.js.
 * Incluye las páginas pilar de SEO (guía y landing por sector) además
 * de las funcionales. Pendiente de añadir cuando se publiquen:
 *   - /preguntas-frecuentes
 *   - /permutas/sanidad, /permutas/age, etc.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = SITE_URL;

  const now = new Date();
  return [
    { url: baseUrl,                         lastModified: now, changeFrequency: "weekly",  priority: 1 },
    { url: `${baseUrl}/auto-permutas`,      lastModified: now, changeFrequency: "daily",   priority: 0.9 },
    { url: `${baseUrl}/anuncios`,           lastModified: now, changeFrequency: "daily",   priority: 0.8 },
    { url: `${baseUrl}/que-es-una-permuta`, lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${baseUrl}/permutas/docentes`,         lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${baseUrl}/permutas/policia-nacional`, lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${baseUrl}/permutas/guardia-civil`,    lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${baseUrl}/preguntas-frecuentes`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${baseUrl}/sobre-el-proyecto`,  lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${baseUrl}/contacto`,           lastModified: now, changeFrequency: "yearly",  priority: 0.4 },
    { url: `${baseUrl}/registro`,           lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${baseUrl}/login`,              lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${baseUrl}/aviso-legal`,        lastModified: now, changeFrequency: "yearly",  priority: 0.3 },
    { url: `${baseUrl}/politica-privacidad`,lastModified: now, changeFrequency: "yearly",  priority: 0.3 },
    { url: `${baseUrl}/condiciones-uso`,    lastModified: now, changeFrequency: "yearly",  priority: 0.3 },
    { url: `${baseUrl}/politica-cookies`,   lastModified: now, changeFrequency: "yearly",  priority: 0.3 },
  ];
}
