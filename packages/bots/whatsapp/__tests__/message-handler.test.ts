let WhatsAppMessageHandler;

beforeAll(async () => {
  ({ WhatsAppMessageHandler } = await import('../dist/message-handler.js'));
});

function makeLogger() {
  return {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  };
}

function makeDeps(overrides = {}) {
  const connection = {
    sendMessage: jest.fn().mockResolvedValue(true),
  };

  const deps = {
    connection,
    commandExecutor: { execute: jest.fn() },
    userService: {
      findOrCreate: jest.fn().mockResolvedValue({
        id: 'u1',
        role: 'admin',
        displayName: 'Tester',
        phoneNumber: '628123',
      }),
      hasAdmin: jest.fn().mockResolvedValue(true),
      setRole: jest.fn().mockResolvedValue(undefined),
    },
    sessionService: {
      getOrCreate: jest.fn(),
    },
    logger: makeLogger(),
    intentDetector: {
      process: jest.fn().mockResolvedValue('balasan-bot'),
    },
    analytics: {
      track: jest.fn().mockResolvedValue(undefined),
    },
    ...overrides,
  };

  return { deps, connection };
}

describe('WhatsAppMessageHandler reply routing', () => {
  const originalForceDmEnv = process.env.WHATSAPP_FORCE_DM_GROUP_JIDS;

  afterEach(() => {
    process.env.WHATSAPP_FORCE_DM_GROUP_JIDS = originalForceDmEnv;
    jest.clearAllMocks();
  });

  it('routes reply to DM when force-DM group is configured', async () => {
    process.env.WHATSAPP_FORCE_DM_GROUP_JIDS = '123@g.us';
    const { deps, connection } = makeDeps();
    const handler = new WhatsAppMessageHandler(deps);

    const msg = {
      key: {
        remoteJid: '123@g.us',
        participant: '628123@s.whatsapp.net',
        id: 'm1',
      },
      pushName: 'Tester',
      message: {
        conversation: 'halo',
      },
    };

    await handler.handle(msg);

    expect(connection.sendMessage).toHaveBeenCalledTimes(1);
    expect(connection.sendMessage).toHaveBeenCalledWith(
      '628123@s.whatsapp.net',
      expect.stringContaining('dialihkan ke chat pribadi'),
    );
    expect(connection.sendMessage).not.toHaveBeenCalledWith('123@g.us', expect.anything(), expect.anything());
  });

  it('routes group replies to DM by default', async () => {
    process.env.WHATSAPP_FORCE_DM_GROUP_JIDS = '';
    const { deps, connection } = makeDeps();
    const handler = new WhatsAppMessageHandler(deps);

    const msg = {
      key: {
        remoteJid: '321@g.us',
        participant: '628321@s.whatsapp.net',
        id: 'm0',
      },
      pushName: 'Tester',
      message: {
        conversation: 'halo grup',
      },
    };

    await handler.handle(msg);

    expect(connection.sendMessage).toHaveBeenCalledTimes(1);
    expect(connection.sendMessage).toHaveBeenCalledWith(
      '628321@s.whatsapp.net',
      expect.stringContaining('dialihkan ke chat pribadi'),
    );
    expect(connection.sendMessage).not.toHaveBeenCalledWith('321@g.us', expect.anything(), expect.anything());
  });

  it('passes quoted message only when target JID matches', async () => {
    process.env.WHATSAPP_FORCE_DM_GROUP_JIDS = '';
    const { deps, connection } = makeDeps();
    const handler = new WhatsAppMessageHandler(deps);

    const msg = {
      key: {
        remoteJid: '555@g.us',
        participant: '628555@s.whatsapp.net',
        id: 'm2',
      },
      pushName: 'Tester',
      message: {
        conversation: 'status?',
      },
    };

    await handler.handle(msg);

    expect(connection.sendMessage).toHaveBeenCalledWith(
      '555@g.us',
      'balasan-bot',
      { quoted: msg },
    );
  });

  it('falls back to DM when group send returns false', async () => {
    process.env.WHATSAPP_FORCE_DM_GROUP_JIDS = '';
    const { deps, connection } = makeDeps();
    connection.sendMessage
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);

    const handler = new WhatsAppMessageHandler(deps);
    const msg = {
      key: {
        remoteJid: '777@g.us',
        participant: '628777@s.whatsapp.net',
        id: 'm3',
      },
      pushName: 'Tester',
      message: {
        conversation: 'cek',
      },
    };

    await handler.handle(msg);

    expect(connection.sendMessage).toHaveBeenNthCalledWith(
      1,
      '777@g.us',
      'balasan-bot',
      { quoted: msg },
    );
    expect(connection.sendMessage).toHaveBeenNthCalledWith(
      2,
      '628777@s.whatsapp.net',
      expect.stringContaining('Gagal kirim ke grup'),
    );
  });

  it('sends auto-extract acknowledgement to DM and forwards technical details to broadcast', async () => {
    process.env.WHATSAPP_FORCE_DM_GROUP_JIDS = '';
    const onTicketCreated = jest.fn().mockResolvedValue(undefined);
    const { deps, connection } = makeDeps({
      nocAutoExtract: true,
      onTicketCreated,
      dataExtractionService: {
        extract: jest.fn().mockReturnValue({
          isValid: true,
          fieldCount: 7,
          priorityScore: 5,
          category: 'REQUEST',
          data: {
            location: 'neuCentrIX Palembang',
            customer: 'JARINGANKU-SARANA-NUSANTARA',
            sid: '2090123956',
            service: 'metro',
            vlanId: '2806',
            hostnameSwitch: 'SW_NEUCENTRIX-TLKA_ARISTA(R1',
            problem: 'minta log, redaman, mac address',
          },
        }),
        checkDuplicate: jest.fn().mockResolvedValue({ isDuplicate: false, similarity: 0 }),
        save: jest.fn().mockResolvedValue(undefined),
      },
      ticketService: {
        create: jest.fn().mockResolvedValue({
          id: 't1',
          ticketNumber: 'PLM-20260411-0001',
          title: 'NOC Auto-Extract',
        }),
      },
      slaService: {
        startTracking: jest.fn().mockResolvedValue(undefined),
      },
      chatPipeline: undefined,
      intentDetector: undefined,
    });
    const handler = new WhatsAppMessageHandler(deps);

    const msg = {
      key: {
        remoteJid: '120363402324316651@g.us',
        participant: '628123@s.whatsapp.net',
        id: 'm4',
      },
      pushName: 'Tester',
      message: {
        conversation: 'buat tiket noc dari teks ini',
      },
    };

    await handler.handle(msg);

    expect(connection.sendMessage).toHaveBeenCalledTimes(1);
    expect(connection.sendMessage).toHaveBeenCalledWith(
      '628123@s.whatsapp.net',
      expect.stringContaining('Detail teknis dikirim ke Telegram NOC'),
    );
    expect(connection.sendMessage).not.toHaveBeenCalledWith(
      '120363402324316651@g.us',
      expect.anything(),
      expect.anything(),
    );

    expect(onTicketCreated).toHaveBeenCalledWith(expect.objectContaining({
      ticketNumber: 'PLM-20260411-0001',
      technicalDetails: expect.stringContaining('location: neuCentrIX Palembang'),
    }));
  });
});
