let WhatsAppConnection;

beforeAll(async () => {
  ({ WhatsAppConnection } = await import('../dist/connection.js'));
});

describe('WhatsAppConnection sendMessage resilience', () => {
  function makeLogger() {
    return {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    };
  }

  it('swallows Connection Closed errors after retries to keep bot alive', async () => {
    const logger = makeLogger();
    const connection = new WhatsAppConnection(
      {
        sessionDir: './data/sessions-test',
        reconnectAttempts: 3,
        reconnectDelay: 10,
      },
      logger,
    );

    connection.socket = {
      sendMessage: jest.fn().mockRejectedValue(new Error('Connection Closed')),
    };

    await expect(connection.sendMessage('123@g.us', 'hello')).resolves.toBe(false);
    expect(connection.socket.sendMessage).toHaveBeenCalledTimes(3);
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('sendMessage failed after 3 attempts'),
      expect.objectContaining({ message: 'Connection Closed' }),
    );
  });

  it('swallows not-acceptable errors after retries to avoid breaking message pipeline', async () => {
    const logger = makeLogger();
    const connection = new WhatsAppConnection(
      {
        sessionDir: './data/sessions-test',
        reconnectAttempts: 3,
        reconnectDelay: 10,
      },
      logger,
    );

    connection.socket = {
      sendMessage: jest.fn().mockRejectedValue(new Error('not-acceptable')),
      groupMetadata: jest.fn().mockResolvedValue({ participants: [{ id: '628123@s.whatsapp.net' }] }),
      assertSessions: jest.fn().mockResolvedValue(undefined),
    };

    await expect(connection.sendMessage('123@g.us', 'hello')).resolves.toBe(false);
    expect(connection.socket.sendMessage).toHaveBeenCalledTimes(3);
    expect(connection.socket.groupMetadata).toHaveBeenCalled();
    expect(connection.socket.assertSessions).toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('sendMessage failed after 3 attempts'),
      expect.objectContaining({ message: 'not-acceptable' }),
    );
  });

  it('throws non-recoverable send errors immediately', async () => {
    const logger = makeLogger();
    const connection = new WhatsAppConnection(
      {
        sessionDir: './data/sessions-test',
        reconnectAttempts: 3,
        reconnectDelay: 10,
      },
      logger,
    );

    connection.socket = {
      sendMessage: jest.fn().mockRejectedValue(new Error('Forbidden by policy')),
    };

    await expect(connection.sendMessage('123@g.us', 'hello')).rejects.toThrow('Forbidden by policy');
    expect(connection.socket.sendMessage).toHaveBeenCalledTimes(1);
  });
});
