const BASE_URL = 'https://api3.geo.admin.ch/rest/services/ech/SearchServer';

/**
 * Search for Swiss addresses using the GeoAdmin SearchServer API.
 *
 * The search can be narrowed by postal code and city.
 *
 * @param {string} searchText - Partial or complete address to search for.
 * @param {Object} [options={}] - Search options.
 * @param {string} [options.zip] - Swiss postal code (NPA), e.g. "2560".
 * @param {string} [options.city] - City name, e.g. "Nidau".
 * @param {string} [options.lang="fr"] - Result language.
 * @param {AbortSignal} [options.signal] - Optional signal used to abort the request.
 *
 * @returns {Promise<Array<{
 *   id: string|number,
 *   lat: number,
 *   lng: number,
 *   label: string
 * }>>} Matching addresses.
 *
 * @throws {Error} If the GeoAdmin request fails.
 */
async function searchAddresses(
  searchText,
  {zip, city, lang = 'fr', signal} = {}
) {
  if (!searchText?.trim()) {
    return [];
  }

  const location = [searchText, zip, city].filter(Boolean).join(' ');

  const params = new URLSearchParams({
    searchText: location,
    type: 'locations',
    origins: 'address',
    lang,
  });

  const response = await fetch(`${BASE_URL}?${params}`, {
    method: 'GET',
    signal,
  });

  if (!response.ok) {
    throw new Error(
      `GeoAdmin search failed: ${response.status} ${response.statusText}`
    );
  }

  const data = await response.json();

  return parseResults(data);
}

function parseResults(data) {
  return (data.results ?? []).map(({id, attrs}) => ({
    id: attrs.featureId,
    lat: attrs.lat,
    lon: attrs.lon,
    label: cleanLabel(attrs.label),
  }));
}

function cleanLabel(label = '') {
  return label
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

module.exports = searchAddresses;
