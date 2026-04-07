const { TicketService } = require('../dist/ticket');

describe('TicketService create with ticketNumber collision', () => {
  function makeDeps() {
    const db = {
      ticket: {
        create: jest.fn(),
        findFirst: jest.fn(),
      },
      ticketHistory: {
        create: jest.fn().mockResolvedValue({ id: 'h1' }),
      },
    };

    const redis = {
      incr: jest.fn(),
      expire: jest.fn().mockResolvedValue(1),
      get: jest.fn(),
      set: jest.fn().mockResolvedValue('OK'),
    };

    const logger = {
      child: jest.fn().mockReturnValue({
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
      }),
    };

    return { db, redis, logger };
  }

  it('retries and succeeds when first ticketNumber is already taken', async () => {
    const { db, redis, logger } = makeDeps();
    const service = new TicketService(db, redis, logger);

    redis.incr
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(2);

    db.ticket.findFirst.mockResolvedValue({ ticketNumber: 'KTB-20260405-0001' });

    const uniqueError = new Error('Unique constraint failed on ticketNumber');
    uniqueError.code = 'P2002';
    uniqueError.meta = { target: ['ticketNumber'] };

    db.ticket.create
      .mockRejectedValueOnce(uniqueError)
      .mockResolvedValueOnce({ id: 't1', ticketNumber: 'KTB-20260405-0002' });

    const ticket = await service.create({
      createdById: 'u1',
      title: 'Gangguan CMDJ',
      description: 'Link down',
      problem: 'down',
      location: 'NEUCENTRIX YOGYAKARTA (KOTABARU)',
    });

    expect(ticket.ticketNumber).toMatch(/^KTB-\d{8}-0002$/);
    expect(db.ticket.create).toHaveBeenCalledTimes(2);
  });

  it('does not retry for unique errors unrelated to ticketNumber', async () => {
    const { db, redis, logger } = makeDeps();
    const service = new TicketService(db, redis, logger);

    redis.incr.mockResolvedValueOnce(1);
    db.ticket.findFirst.mockResolvedValue(null);

    const otherUniqueError = new Error('Unique constraint failed on another field');
    otherUniqueError.code = 'P2002';
    otherUniqueError.meta = { target: ['externalId'] };
    db.ticket.create.mockRejectedValueOnce(otherUniqueError);

    await expect(
      service.create({
        createdById: 'u1',
        title: 'Gangguan CMDJ',
        description: 'Link down',
        problem: 'down',
        location: 'NEUCENTRIX YOGYAKARTA (KOTABARU)',
      }),
    ).rejects.toBe(otherUniqueError);

    expect(db.ticket.create).toHaveBeenCalledTimes(1);
  });
});
