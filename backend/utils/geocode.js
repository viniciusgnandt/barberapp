// utils/geocode.js — Geocodificação via Nominatim (OpenStreetMap)

/**
 * Converte endereço em coordenadas [longitude, latitude] (formato GeoJSON).
 * Retorna null se não encontrar resultado.
 */
async function geocodeAddress({ address, neighborhood, city, state, zipCode }) {
  const parts = [address, neighborhood, city, state, zipCode].filter(Boolean);
  if (!parts.length) return null;

  const q = parts.join(', ') + ', Brasil';
  const url = `https://nominatim.openstreetmap.org/search?${new URLSearchParams({
    q,
    format: 'json',
    limit: '1',
    countrycodes: 'br',
  })}`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'BarberApp/1.0' },
      signal: AbortSignal.timeout(5000),
    });
    const data = await res.json();
    if (data.length) {
      return {
        type: 'Point',
        coordinates: [parseFloat(data[0].lon), parseFloat(data[0].lat)],
      };
    }
  } catch (err) {
    console.error('[geocode] Falha ao geocodificar:', err.message);
  }
  return null;
}

module.exports = { geocodeAddress };
