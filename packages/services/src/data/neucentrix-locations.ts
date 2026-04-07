/**
 * neuCentrIX location reference data
 * Migrated from old bot dashboard
 * Used for ticket location validation and reporting
 */

export interface NeucentrixLocation {
  code: string;
  fullName: string;
  region?: string;
}

export const NEUCENTRIX_LOCATIONS: NeucentrixLocation[] = [
  // Sumatera
  { code: 'BTM', fullName: 'neuCentrIX Batam Center', region: 'Riau Islands' },
  { code: 'PKU', fullName: 'neuCentrIX Pekanbaru', region: 'Riau' },
  { code: 'TLK', fullName: 'neuCentrIX Talang Kelapa', region: 'South Sumatera' },
  { code: 'TKL', fullName: 'neuCentrIX Tanjung Karang Lampung', region: 'Lampung' },
  { code: 'ACH', fullName: 'neuCentrIX Aceh', region: 'Aceh' },
  { code: 'PLM', fullName: 'neuCentrIX Palembang', region: 'South Sumatera' },

  // Java
  { code: 'KTS', fullName: 'neuCentrIX Karet Tengsin', region: 'Jakarta' },
  { code: 'MRY', fullName: 'neuCentrIX Meruya', region: 'Jakarta' },
  { code: 'JTN', fullName: 'neuCentrIX Jatinegara', region: 'Jakarta' },
  { code: 'LMB', fullName: 'neuCentrIX Lembong', region: 'Bandung' },
  { code: 'KBL', fullName: 'neuCentrIX Kebalen', region: 'Semarang' },
  { code: 'MLG', fullName: 'neuCentrIX Malang', region: 'East Java' },
  { code: 'GBG', fullName: 'neuCentrIX Gubeng', region: 'Surabaya' },
  { code: 'KLS', fullName: 'neuCentrIX Kaliasem', region: 'East Java' },
  { code: 'CRB', fullName: 'neuCentrIX Cirebon', region: 'West Java' },

  // Kalimantan
  { code: 'BPN', fullName: 'neuCentrIX TTC Balikpapan', region: 'East Kalimantan' },
  { code: 'PTK', fullName: 'neuCentrIX Pontianak', region: 'West Kalimantan' },
  { code: 'BJM', fullName: 'neuCentrIX Ulin Banjarmasin', region: 'South Kalimantan' },
  { code: 'KTB', fullName: 'neuCentrIX Kotabaru', region: 'South Kalimantan' },
  { code: 'SPK', fullName: 'neuCentrIX Sepaku', region: 'East Kalimantan' },
  { code: 'BTA', fullName: 'neuCentrIX Batuampar', region: 'West Kalimantan' },
  { code: 'MKS', fullName: 'neuCentrIX Mattoangin', region: 'South Kalimantan' },
  { code: 'PGR', fullName: 'neuCentrIX Pugeran', region: 'South Kalimantan' },

  // Sumatera Utara
  { code: 'MDN', fullName: 'neuCentrIX Medan Centrum', region: 'North Sumatera' },

  // Eastern Indonesia
  { code: 'MND', fullName: 'neuCentrIX Paniki', region: 'North Sulawesi' },
  { code: 'JPR', fullName: 'neuCentrIX Jayapura', region: 'Papua' },
];

const LOCATION_STOP_WORDS = new Set([
  'neucentrix',
  'neucen',
  'ncx',
  'dc',
  'kota',
  'indonesia',
  'jl',
  'jalan',
]);

function tokenizeLocation(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

/**
 * Lookup location by exact code or exact full name (case-insensitive).
 */
export function findLocation(query: string): NeucentrixLocation | undefined {
  const normalized = query.toUpperCase().trim();
  return NEUCENTRIX_LOCATIONS.find(
    (loc) => loc.code === normalized || loc.fullName.toUpperCase() === normalized
  );
}

/**
 * Fuzzy lookup: resolves free-text location input (from WhatsApp messages) to a
 * canonical NeucentrixLocation.
 *
 * Resolution order:
 *  1. Exact code match        ("BTM" → neuCentrIX Batam Center)
 *  2. Exact full-name match   ("neuCentrIX Batam Center" → BTM)
 *  3. Stripped-prefix exact   ("Batam Center" after removing neuCentrIX/NCX/DC)
 *  4. Word-exact match        every query word (≥3 chars) found as a whole word in
 *                             the location name — prevents "batam" from matching
 *                             "batuampar".
 */
export function resolveLocation(query: string): NeucentrixLocation | undefined {
  if (!query?.trim()) return undefined;

  const q = query.trim();

  // 1. Exact code match
  const byCode = NEUCENTRIX_LOCATIONS.find((loc) => loc.code === q.toUpperCase());
  if (byCode) return byCode;

  // 2. Exact full-name match (case-insensitive)
  const qLower = q.toLowerCase();
  const byFullName = NEUCENTRIX_LOCATIONS.find(
    (loc) => loc.fullName.toLowerCase() === qLower,
  );
  if (byFullName) return byFullName;

  // Strip common prefixes used in messages (neucentrix / neucen / ncx / dc)
  const strippedTokens = tokenizeLocation(q)
    .filter((w) => w.length >= 3)
    .filter((w) => !LOCATION_STOP_WORDS.has(w));
  const stripped = strippedTokens.join(' ');

  if (!strippedTokens.length) return undefined;

  // 3. Exact match against fullName with its own canonical prefix removed
  const byStripped = NEUCENTRIX_LOCATIONS.find(
    (loc) => tokenizeLocation(loc.fullName.replace(/^neuCentrIX\s*/i, '')).join(' ') === stripped,
  );
  if (byStripped) return byStripped;

  // 4. Word-exact match: every significant query word must be present as a
  //    whole word in the location's full name (split on whitespace).
  //    Using whole-word comparison prevents "batam" ↔ "batuampar" collisions.
  const queryWords = strippedTokens;
  if (queryWords.length > 0) {
    const match = NEUCENTRIX_LOCATIONS.find((loc) => {
      const locWords = tokenizeLocation(loc.fullName);
      return queryWords.every((w) => locWords.includes(w));
    });
    if (match) return match;
  }

  // 5. Best-overlap fallback for mixed-form inputs, e.g.
  //    "NEUCENTRIX YOGYAKARTA (KOTABARU)" -> "neuCentrIX Kotabaru".
  //    We only accept a unique best hit to avoid wrong mappings.
  let best: NeucentrixLocation | undefined;
  let bestScore = 0;
  let tie = false;
  for (const loc of NEUCENTRIX_LOCATIONS) {
    const locWords = new Set(tokenizeLocation(loc.fullName));
    const score = queryWords.reduce((acc, w) => acc + (locWords.has(w) ? 1 : 0), 0);
    if (score > bestScore) {
      bestScore = score;
      best = loc;
      tie = false;
    } else if (score > 0 && score === bestScore) {
      tie = true;
    }
  }

  if (bestScore > 0 && !tie) return best;

  return undefined;
}

/**
 * Get all location codes
 */
export function getAllLocationCodes(): string[] {
  return NEUCENTRIX_LOCATIONS.map((loc) => loc.code);
}

/**
 * Get all location full names
 */
export function getAllLocationNames(): string[] {
  return NEUCENTRIX_LOCATIONS.map((loc) => loc.fullName);
}

/**
 * Filter locations by region
 */
export function getLocationsByRegion(region: string): NeucentrixLocation[] {
  return NEUCENTRIX_LOCATIONS.filter((loc) => loc.region?.toLowerCase() === region.toLowerCase());
}
