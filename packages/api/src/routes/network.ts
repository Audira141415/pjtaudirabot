import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { AppContext } from '../types';

export default async function networkRoutes(app: FastifyInstance, ctx: AppContext) {
  
  app.get('/map-status', async (request: FastifyRequest, reply: FastifyReply) => {
    // Define main DC locations in Batam area
    const locations = [
      { id: 'btc', name: 'neuCentrIX Batam Center', lat: 1.1278, lng: 104.0526 },
      { id: 'pac', name: 'PAC - neuCentrIX Panbil', lat: 1.0827, lng: 104.0375 },
      { id: 'tuc', name: 'neuCentrIX Tanjung Uncang', lat: 1.0500, lng: 103.9300 },
      { id: 'ngy', name: 'NOC Nagoya', lat: 1.1450, lng: 104.0150 },
      { id: 'pbi', name: 'DC Panbil Industrial', lat: 1.0850, lng: 104.0450 }
    ];

    const mapData = await Promise.all(locations.map(async (loc) => {
      // Check for open incidents or SLA breaches
      const criticalCount = await ctx.db.ticket.count({
        where: {
          location: { contains: loc.name, mode: 'insensitive' },
          status: { in: ['OPEN', 'ESCALATED'] },
          OR: [
            { priority: 'CRITICAL' },
            { slaTracking: { OR: [{ responseBreached: true }, { resolutionBreached: true }] } }
          ]
        }
      });

      // Check for PM due today
      const now = new Date();
      const endOfDay = new Date(now);
      endOfDay.setHours(23, 59, 59, 999);
      
      const warningCount = await ctx.db.maintenanceSchedule.count({
        where: {
          location: { contains: loc.name, mode: 'insensitive' },
          nextRun: { lte: endOfDay },
          lastStatus: { not: 'COMPLETED' }
        }
      });

      let status: 'healthy' | 'warning' | 'critical' = 'healthy';
      if (criticalCount > 0) status = 'critical';
      else if (warningCount > 0) status = 'warning';

      return {
        ...loc,
        status,
        metrics: {
          critical: criticalCount,
          warning: warningCount
        }
      };
    }));

    return reply.send({ data: mapData });
  });

  // Feature 4: Shift Handover Summary
  app.get('/shift-handover', async (request: FastifyRequest, reply: FastifyReply) => {
    const openTickets = await ctx.db.ticket.findMany({
      where: { status: { notIn: ['RESOLVED', 'CLOSED'] } },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    const summary = {
      timestamp: new Date().toISOString(),
      openTicketCount: openTickets.length,
      criticalCount: openTickets.filter(t => t.priority === 'CRITICAL').length,
      tickets: openTickets.map(t => ({
        number: t.ticketNumber,
        customer: t.customer,
        priority: t.priority,
        status: t.status,
        age: Math.floor((Date.now() - t.createdAt.getTime()) / 3600000) + 'h'
      }))
    };

    return reply.send({ data: summary });
  });
}
