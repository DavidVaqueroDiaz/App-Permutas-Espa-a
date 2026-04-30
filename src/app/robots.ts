import type { MetadataRoute } from "next";

/**
 * robots.txt generado dinámicamente por Next.js.
 *
 * Política de la app:
 *   - Permitimos a TODOS los bots, incluidos los de IA generativa
 *     (GPTBot de OpenAI, ClaudeBot de Anthropic, PerplexityBot,
 *     Google-Extended, CCBot de Common Crawl, Applebot-Extended).
 *     Esto es CLAVE para que la app sea descubierta cuando alguien
 *     pregunta a ChatGPT, Claude, Perplexity, etc. "donde puedo
 *     buscar permutas de funcionario en España".
 *   - Bloqueamos rutas privadas (/api de uso interno, /admin) por
 *     seguridad y para no perder presupuesto de crawl.
 */
export default function robots(): MetadataRoute.Robots {
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://permutaes.vercel.app";

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/admin/"],
      },
      // Bots de IA — permitidos explícitamente para GEO/AEO
      { userAgent: "GPTBot", allow: "/" },
      { userAgent: "ChatGPT-User", allow: "/" },
      { userAgent: "OAI-SearchBot", allow: "/" },
      { userAgent: "ClaudeBot", allow: "/" },
      { userAgent: "Claude-User", allow: "/" },
      { userAgent: "Claude-SearchBot", allow: "/" },
      { userAgent: "PerplexityBot", allow: "/" },
      { userAgent: "Perplexity-User", allow: "/" },
      { userAgent: "Google-Extended", allow: "/" },
      { userAgent: "GoogleOther", allow: "/" },
      { userAgent: "CCBot", allow: "/" },
      { userAgent: "Applebot-Extended", allow: "/" },
      { userAgent: "Bytespider", allow: "/" },
      { userAgent: "Amazonbot", allow: "/" },
      { userAgent: "Meta-ExternalAgent", allow: "/" },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
