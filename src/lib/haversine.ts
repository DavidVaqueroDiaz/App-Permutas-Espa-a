/**
 * Distancia geodésica entre dos puntos (lat, lon) en km usando la
 * fórmula de Haversine. Suficientemente precisa para distancias <500 km.
 */
export function haversine(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371; // radio medio de la Tierra en km
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Margenes en grados de un recuadro que contenga TODOS los puntos a
 * `radioKm` (mas 5 km de holgura) de cualquiera de las latitudes dadas.
 * La longitud se calcula con la latitud mas alejada del ecuador, donde
 * un grado de longitud es mas corto.
 */
export function margenesRecuadro(
  latitudes: number[],
  radioKm: number,
): { margenLat: number; margenLon: number } {
  const km = radioKm + 5;
  const margenLat = km / 111;
  const latMax = Math.min(
    89,
    Math.max(0, ...latitudes.map((l) => Math.abs(l))) + margenLat,
  );
  const kmPorGradoLon = 111.32 * Math.cos((latMax * Math.PI) / 180);
  return { margenLat, margenLon: km / kmPorGradoLon };
}

/** Score 0-100 según km / radio. Cuanto más cerca, más alto. */
export function scoreKm(km: number, radio: number): number {
  if (km > radio) return 0;
  // Curva: 100 si km=0; cae linealmente a 50 cuando km=radio.
  return Math.max(0, 100 - (km / radio) * 50);
}
