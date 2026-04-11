const { DataExtractionService } = require('../dist/data-extraction');
const { resolveLocation } = require('../dist/data/neucentrix-locations');

// ─── resolveLocation ───────────────────────────────────────────────────────────
describe('resolveLocation', () => {
  test.each([
    // exact code (upper / lower)
    ['BTM', 'neuCentrIX Batam Center'],
    ['btm', 'neuCentrIX Batam Center'],
    // full canonical name
    ['neuCentrIX Batam Center', 'neuCentrIX Batam Center'],
    // stripped prefix exact
    ['Batam Center', 'neuCentrIX Batam Center'],
    // single keyword
    ['Batam', 'neuCentrIX Batam Center'],
    ['batam', 'neuCentrIX Batam Center'],
    // with NCX / DC prefix
    ['NCX Batam', 'neuCentrIX Batam Center'],
    ['DC Batam', 'neuCentrIX Batam Center'],
    // multi-word stripped
    ['Karet Tengsin', 'neuCentrIX Karet Tengsin'],
    ['karet tengsin', 'neuCentrIX Karet Tengsin'],
    // Batuampar should NOT accidentally resolve to Batam Center
    ['Batuampar', 'neuCentrIX Batuampar'],
    ['BTA', 'neuCentrIX Batuampar'],
    ['NEUCENTRIX YOGYAKARTA (KOTABARU)', 'neuCentrIX Kotabaru'],
    // other cities
    ['Surabaya', undefined],   // region, not a location name
    ['', undefined],
  ])('resolveLocation(%j) → fullName=%j', (input, expected) => {
    const result = resolveLocation(input);
    expect(result?.fullName).toBe(expected);
  });
});

// ─── location normalisation in data extraction ─────────────────────────────────
describe('DataExtractionService location normalisation', () => {
  const service = new DataExtractionService({}, {});

  it('normalises "Batam" keyword to canonical fullName', () => {
    const result = service.extract([
      'Customer: PT Example',
      'Lokasi: Batam',
      'Problem: Link down',
    ].join('\n'));
    expect(result.data.location).toBe('neuCentrIX Batam Center');
  });

  it('normalises location shortcode BTM to canonical fullName', () => {
    const result = service.extract([
      'Customer: PT Example',
      'Lokasi: BTM',
      'Problem: Link down',
    ].join('\n'));
    expect(result.data.location).toBe('neuCentrIX Batam Center');
  });

  it('normalises full neuCentrIX name regardless of capitalisation', () => {
    const result = service.extract([
      'Customer: PT Example',
      'Lokasi: NEUCENTRIX BATAM CENTER',
      'Problem: Link down',
    ].join('\n'));
    expect(result.data.location).toBe('neuCentrIX Batam Center');
  });

  it('keeps unrecognised location as-is', () => {
    const result = service.extract([
      'Customer: PT Example',
      'Lokasi: Unknown DC Yogyakarta',
      'Problem: Link down',
    ].join('\n'));
    expect(result.data.location).toBe('Unknown DC Yogyakarta');
  });

  it('does not confuse Batuampar with Batam Center', () => {
    const result = service.extract([
      'Customer: PT Example',
      'Lokasi: Batuampar',
      'Problem: Link down',
    ].join('\n'));
    expect(result.data.location).toBe('neuCentrIX Batuampar');
  });

  it('maps mixed-form location to canonical Kotabaru', () => {
    const result = service.extract([
      'Nama Cust: CMDJ',
      'Lokasi Neucentrix : NEUCENTRIX YOGYAKARTA (KOTABARU)',
      'Laporan Gangguan/Request : Gangguan',
    ].join('\n'));
    expect(result.data.location).toBe('neuCentrIX Kotabaru');
  });
});

describe('DataExtractionService hostname parsing', () => {
  const service = new DataExtractionService({}, {});

  it('strips repeated Description prefix from explicit hostname alias', () => {
    const result = service.extract([
      'Customer: PT Example',
      'Hostname/Switch: Description: SW_NEUCENTRIX_MRY_01',
      'Problem: Link down',
    ].join('\n'));

    expect(result.data.hostnameSwitch).toBe('SW_NEUCENTRIX_MRY_01');
  });

  it('does not use a Description line as hostname when no hostname alias exists', () => {
    const result = service.extract([
      'Customer: PT Example',
      'Description: SW_NEUCENTRIX_MRY_01',
      'Problem: Link down',
    ].join('\n'));

    expect(result.data.hostnameSwitch).toBeUndefined();
    expect(result.data.problem).toBe('Link down');
  });

  it('normalizes ethernet interface notation: ethernet8 → port 8', () => {
    const result = service.extract([
      'Customer: PT Example',
      'Hostname: SW_NEUCENTRIX_JKT_01',
      'Port: ethernet8',
      'Problem: Link down',
    ].join('\n'));

    expect(result.data.port).toBe('port 8');
  });

  it('builds alokasi from hostname and port', () => {
    const result = service.extract([
      'Customer: PT Example',
      'Hostname: SW_NEUCENTRIX_JKT_01',
      'Port: GE0/0',
      'Problem: Link down',
    ].join('\n'));

    expect(result.data.alokasi).toBe('SW_NEUCENTRIX_JKT_01 / GE0/0');
  });

  it('alokasi only includes defined fields (hostname only)', () => {
    const result = service.extract([
      'Customer: PT Example',
      'Hostname: SW_NEUCENTRIX_JKT_01',
      'Problem: Link down',
    ].join('\n'));

    expect(result.data.alokasi).toBe('SW_NEUCENTRIX_JKT_01');
  });

  it('alokasi only includes defined fields (port only)', () => {
    const result = service.extract([
      'Customer: PT Example',
      'Port: ethernet8',
      'Problem: Link down',
    ].join('\n'));

    expect(result.data.alokasi).toBe('port 8');
  });

  it('separates lokasi from alokasi correctly', () => {
    const result = service.extract([
      'Customer: PT Example',
      'Lokasi: NEUCENTRIX JAKARTA',
      'Hostname: SW_NEUCENTRIX_JKT_01',
      'Port: ethernet8',
      'Problem: Link down',
    ].join('\n'));

    expect(result.data.location).toBeDefined();
    expect(result.data.alokasi).toBe('SW_NEUCENTRIX_JKT_01 / port 8');
  });
});