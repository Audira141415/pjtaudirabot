const { ReportService } = require('../dist/report');

describe('ReportService.generateMonthlyReport', () => {
  it('builds monthly report and queries month range correctly', async () => {
    const db = {
      ticket: {
        count: jest
          .fn()
          .mockResolvedValueOnce(12)
          .mockResolvedValueOnce(9)
          .mockResolvedValueOnce(5),
        groupBy: jest.fn().mockResolvedValue([
          { customer: 'PT Alpha', _count: { id: 6 } },
          { customer: 'PT Beta', _count: { id: 3 } },
        ]),
      },
      sLATracking: {
        findMany: jest.fn().mockResolvedValue([
          { responseBreached: false, resolutionBreached: false },
          { responseBreached: true, resolutionBreached: false },
          { responseBreached: false, resolutionBreached: true },
        ]),
      },
      escalation: {
        count: jest.fn().mockResolvedValue(2),
      },
    };

    const logger = { child: () => ({}) };
    const service = new ReportService(db, logger);
    const referenceDate = new Date('2026-04-21T10:00:00+07:00');

    const report = await service.generateMonthlyReport(referenceDate);

    expect(report).toContain('MONTHLY REPORT');
    expect(report).toContain('New: 12');
    expect(report).toContain('Resolved: 9');
    expect(report).toContain('Still open: 5');
    expect(report).toContain('Response SLA met: 67%');
    expect(report).toContain('Resolution SLA met: 67%');
    expect(report).toContain('Escalations*: 2');
    expect(report).toContain('PT Alpha: 6 tickets');

    const firstWhere = db.ticket.count.mock.calls[0][0].where;
    expect(firstWhere.createdAt.gte.getDate()).toBe(1);
    expect(firstWhere.createdAt.gte.getMonth()).toBe(referenceDate.getMonth());
    expect(firstWhere.createdAt.gte.getFullYear()).toBe(referenceDate.getFullYear());
    expect(firstWhere.createdAt.lt.getDate()).toBe(1);
    expect(firstWhere.createdAt.lt.getMonth()).toBe((referenceDate.getMonth() + 1) % 12);

    const thirdWhere = db.ticket.count.mock.calls[2][0].where;
    expect(thirdWhere.createdAt.gte.getDate()).toBe(1);
    expect(thirdWhere.createdAt.lt.getDate()).toBe(1);
    expect(thirdWhere.status.in).toEqual(['OPEN', 'IN_PROGRESS', 'ESCALATED']);

    expect(db.ticket.groupBy).toHaveBeenCalledTimes(1);
    expect(db.sLATracking.findMany).toHaveBeenCalledTimes(1);
    expect(db.escalation.count).toHaveBeenCalledTimes(1);
  });
});
