const BASE_URL = 'https://api3.geo.admin.ch/rest/services/ech/MapServer/';

const LAYER = 'ch.swisstopo.amtliches-gebaeudeadressverzeichnis';

function parseZipLabel(zipLabel) {
  const match = String(zipLabel ?? '')
    .trim()
    .match(/^(\d{4})\s+(.+)$/);
  return match ? {zip: match[1], city: match[2]} : {zip: null, city: null};
}

async function findAddress(featureId, locale, signal) {
  const [egid, edid = '0'] = String(featureId).split('_');
  const params = new URLSearchParams({
    layer: LAYER,
    searchText: egid,
    searchField: 'bdg_egid',
    contains: 'false',
    returnGeometry: 'false',
    lang: locale,
  });

  const response = await fetch(`${BASE_URL}find?${params}`, {signal});
  if (!response.ok) {
    throw new Error(
      `GeoAdmin lookup failed: ${response.status} ${response.statusText}`
    );
  }

  const {results = []} = await response.json();
  return (
    results.find(({attributes}) => String(attributes?.adr_edid ?? '0') === edid)
      ?.attributes ??
    results[0]?.attributes ??
    null
  );
}

async function getFeatureAddress(featureId, locale, signal) {
  if (String(featureId).includes('_')) {
    return findAddress(featureId, locale, signal);
  }

  const params = new URLSearchParams({
    returnGeometry: 'false',
    lang: locale,
  });
  const response = await fetch(
    `${BASE_URL}${LAYER}/${encodeURIComponent(featureId)}?${params}`,
    {signal}
  );
  if (!response.ok) {
    throw new Error(
      `GeoAdmin lookup failed: ${response.status} ${response.statusText}`
    );
  }

  const {feature} = await response.json();
  return feature?.attributes ?? null;
}

/**
 * Resolve a structured address from a GeoAdmin SearchServer featureId.
 *
 * @param {string|number} featureId - SearchServer featureId.
 * @param {string} [locale='fr'] - Result language.
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
 *   egaid: number|null,
 *   canton: string|null
 * }|null>}
 */
async function getAddress(featureId, locale = 'fr', signal) {
  const attrs = await getFeatureAddress(featureId, locale, signal);
  if (!attrs) {
    return null;
  }

  const {zip, city} = parseZipLabel(attrs.zip_label);

  return {
    street: attrs.stn_label ?? null,
    houseNumber: attrs.adr_number ?? null,
    zip,
    city,
    municipality: attrs.com_name ?? null,
    municipalityId: attrs.com_fosnr ?? null,
    egid: attrs.bdg_egid ?? null,
    edid: attrs.adr_edid ?? null,
    egaid: attrs.adr_egaid ?? null,
    canton: attrs.com_canton ?? null,
  };
}

module.exports = getAddress;
