/**
 * Inserta un bloque <script type="application/ld+json"> con el schema
 * que se le pase. Se usa en Server Components para añadir Schema.org
 * estructurado a páginas SEO (artículos, FAQ, etc.).
 *
 * El JSON se serializa con `JSON.stringify` sin caracteres especiales
 * que rompan el script tag (escape de "<" como precaución).
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return (
    <script
      type="application/ld+json"
      // El contenido es un JSON serializado por nosotros, no input
      // de usuario, así que es seguro inyectarlo aquí.
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}
