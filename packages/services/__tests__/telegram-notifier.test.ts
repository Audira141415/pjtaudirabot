const { TelegramNotifier } = require('../dist/notification/telegram-notifier');

function makeLogger() {
  return {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    child: jest.fn().mockReturnValue({
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    }),
  };
}

describe('TelegramNotifier sendNewTicket', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: jest.fn().mockResolvedValue(''),
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  it('omits Problem section when problem is not provided', async () => {
    const notifier = new TelegramNotifier('token', '-100123', makeLogger());

    await notifier.sendNewTicket({
      id: 't1',
      ticketNumber: 'PLM-20260411-0001',
      title: 'NOC Auto-Extract',
      priority: 'MEDIUM',
      category: 'REQUEST',
      createdByName: 'Tester',
      technicalDetails: [
        '  • location: neuCentrIX-Batuampar',
        '  • customer: PT. Perdana Teknologi Persada',
        '  • vlanId: 2093',
        '  • hostnameSwitch: R6.BAM.LEAF-CNDC.01',
        '  • port: port 7',
        '  • mode: Trunk',
      ].join('\n'),
    });

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const requestBody = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
    expect(requestBody.text).not.toContain('<i>Problem:</i>');
    expect(requestBody.text).not.toContain('Mas moban untuk pemasangan IP dummy');
    expect(requestBody.text).toContain('📍 <b>Lokasi:</b> neuCentrIX-Batuampar');
    expect(requestBody.text).toContain('🔧 <b>Alokasi:</b> R6.BAM.LEAF-CNDC.01 / port 7');
  });

  it('renders core fields in the expected short order', async () => {
    const notifier = new TelegramNotifier('token', '-100123', makeLogger());

    await notifier.sendNewTicket({
      id: 't2',
      ticketNumber: 'PLM-20260411-0002',
      title: 'NOC Auto-Extract',
      priority: 'HIGH',
      category: 'REQUEST',
      createdByName: 'Tester',
      alokasi: 'R6.BAM.LEAF-CNDC.01 / port 7',
      problem: undefined,
      technicalDetails: [
        '  • location: neuCentrIX-Batuampar',
        '  • customer: PT. Perdana Teknologi Persada',
        '  • vlanId: 2093',
        '  • mode: Trunk',
      ].join('\n'),
    });

    const requestBody = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
    const text = requestBody.text;
    expect(text.indexOf('📍 <b>Lokasi:</b>')).toBeLessThan(text.indexOf('👤 <b>Customer:</b>'));
    expect(text.indexOf('👤 <b>Customer:</b>')).toBeLessThan(text.indexOf('🔧 <b>Alokasi:</b>'));
    expect(text.indexOf('🔧 <b>Alokasi:</b>')).toBeLessThan(text.indexOf('🌐 <b>VLAN:</b>'));
    expect(text.indexOf('🌐 <b>VLAN:</b>')).toBeLessThan(text.indexOf('🧭 <b>Mode:</b>'));
    expect(text).not.toContain('<i>Problem:</i>');
    expect(text).not.toContain('mas moban');
  });

  it('keeps Problem last when it is present', async () => {
    const notifier = new TelegramNotifier('token', '-100123', makeLogger());

    await notifier.sendNewTicket({
      id: 't3',
      ticketNumber: 'PLM-20260411-0003',
      title: 'NOC Auto-Extract',
      priority: 'LOW',
      category: 'REQUEST',
      createdByName: 'Tester',
      problem: 'Link down in the morning',
      technicalDetails: [
        '  • location: neuCentrIX-Batuampar',
        '  • customer: PT. Perdana Teknologi Persada',
        '  • alokasi: R6.BAM.LEAF-CNDC.01 / port 7',
        '  • vlanId: 2093',
        '  • mode: Trunk',
      ].join('\n'),
    });

    const requestBody = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
    const text = requestBody.text;
    expect(text.indexOf('📍 <b>Lokasi:</b>')).toBeLessThan(text.indexOf('👤 <b>Customer:</b>'));
    expect(text.indexOf('👤 <b>Customer:</b>')).toBeLessThan(text.indexOf('🔧 <b>Alokasi:</b>'));
    expect(text.indexOf('🔧 <b>Alokasi:</b>')).toBeLessThan(text.indexOf('🌐 <b>VLAN:</b>'));
    expect(text.indexOf('🌐 <b>VLAN:</b>')).toBeLessThan(text.indexOf('🧭 <b>Mode:</b>'));
    expect(text.indexOf('🧭 <b>Mode:</b>')).toBeLessThan(text.indexOf('📝 <b>Problem:</b>'));
    expect(text).toContain('📝 <b>Problem:</b> Link down in the morning');
  });

  it('escapes HTML and falls back to technical problem details', async () => {
    const notifier = new TelegramNotifier('token', '-100123', makeLogger());

    await notifier.sendNewTicket({
      id: 't4',
      ticketNumber: 'PLM-20260411-0004',
      title: 'NOC <Auto> & Extract',
      priority: 'MEDIUM',
      category: 'REQUEST',
      createdByName: 'Tester & Co',
      technicalDetails: [
        'location: neuCentrIX <Batuampar>',
        'customer: PT & Co <Alpha>',
        'alokasi: R6.BAM.LEAF-CNDC.01 / port 7',
        'vlan: 2093',
        'mode: Trunk',
        'problem: Link <down> & degraded',
      ].join('\n'),
    });

    const requestBody = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
    const text = requestBody.text;
    expect(text).toContain('📝 NOC &lt;Auto&gt; &amp; Extract');
    expect(text).toContain('👤 Dari: <b>Tester &amp; Co</b>');
    expect(text).toContain('📍 <b>Lokasi:</b> neuCentrIX &lt;Batuampar&gt;');
    expect(text).toContain('👤 <b>Customer:</b> PT &amp; Co &lt;Alpha&gt;');
    expect(text).toContain('📝 <b>Problem:</b> Link &lt;down&gt; &amp; degraded');
  });
});
