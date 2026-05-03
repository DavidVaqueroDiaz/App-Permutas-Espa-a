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

/** Score 0-100 según km / radio. Cuanto más cerca, más alto. */
export function scoreKm(km: number, radio: number): number {
  if (km > radio) return 0;
  // Curva: 100 si km=0; cae linealmente a 50 cuando km=radio.
  return Math.max(0, 100 - (km / radio) * 50);
}
