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
});
