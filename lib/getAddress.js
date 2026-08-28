const BASE_URL = 'https://api3.geo.admin.ch/rest/services/ech/MapServer/find';

const LAYER = 'ch.swisstopo.amtliches-gebaeudeadressverzeichnis';

/**
 * Resolve a structured address from a GeoAdmin SearchServer featureId.
 *
 * @param {string} featureId - SearchServer featureId, e.g. "1487827_0".
 * @param {AbortSignal} [signal] - Optional abort signal.
 * @returns {Promise<{
 *   street: string|null,
 *   houseNumber: string|null,
 *   zip: string|null,
 *   city: string|null,
 *   municipality: string|null,
 *   municipalityId: number|null,
 *   egid: number|null,
 *   edid: number|null,
 *   egaid: number|null
 * }|null>}
 */
async function getAddress(featureId, signal) {
  const [egid, edid = '0'] = String(featureId).split('_');

  const params = new URLSearchParams({
    layer: LAYER,
    searchText: egid,
    searchField: 'bdg_egid',
    contains: 'false',
    returnGeometry: 'false',
    lang: 'fr',
  });

  const response = await fetch(`${BASE_URL}?${params}`, {
    signal,
  });

  if (!response.ok) {
    throw new Error(
      `GeoAdmin lookup failed: ${response.status} ${response.statusText}`
    );
  }

  const data = await response.json();

  const candidates = data.results ?? [];

  const result =
    candidates.find(
      ({attributes}) => String(attributes?.adr_edid ?? '0') === edid
    ) ?? candidates[0];

  if (!result) {
    return null;
  }

  const attrs = result.attributes ?? {};

  return {
    street: attrs.stn_label ?? attrs.str_label ?? null,
    houseNumber: attrs.adr_number ?? null,
    municipality: attrs.com_name ?? null,
    municipalityId: attrs.com_fosnr ?? null,
    egid: attrs.bdg_egid ?? null,
    edid: attrs.adr_edid ?? null,
    egaid: attrs.adr_egaid ?? null,
  };
}

module.exports = getAddress;
