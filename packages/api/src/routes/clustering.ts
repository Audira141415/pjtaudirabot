import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { ILogger } from '@pjtaudirabot/core';
import * as Services from '@pjtaudirabot/services';
import { PrismaClient } from '@prisma/client';

export async function clusteringRoutes(
  app: FastifyInstance,
  ctx: { db: PrismaClient; logger: ILogger },
): Promise<void> {
  const { db, logger } = ctx;
  const ClusteringServiceCtor = (Services as any).TicketClusteringService ?? (Services as any).default;
  const clustering = new ClusteringServiceCtor(db, logger);

  app.addHook('onRequest', async (request, reply) => {
    try {
      await request.jwtVerify();
      const payload = request.user as { role?: string };
      if (payload.role !== 'admin') {
        return reply.status(403).send({ error: 'Admin access required' });
      }
    } catch {
      return reply.status(401).send({ error: 'Unauthorized' });
    }
  });

  /**
   * [GET] /api/tickets/cluster/:clusterId
   * Get detailed cluster information
   */
  app.get('/cluster/:clusterId', async (req: FastifyRequest<{ Params: { clusterId: string } }>, reply: FastifyReply) => {
    try {
      const { clusterId } = req.params;
      const details = await clustering.getClusterDetails(clusterId);

      if (!details) {
        return reply.code(404).send({ error: 'Cluster not found' });
      }

      return reply.send(details);
    } catch (error) {
      logger.error('Get cluster details failed', error as Error);
      return reply.code(500).send({ error: 'Failed to get cluster details' });
    }
  });

  /**
   * [GET] /api/tickets/cluster/:clusterId/members
   * List all member tickets in cluster
   */
  app.get('/cluster/:clusterId/members', async (req: FastifyRequest<{ Params: { clusterId: string } }>, reply: FastifyReply) => {
    try {
      const { clusterId } = req.params;
      const members = await db.ticketClusterMember.findMany({
        where: { clusterId },
        include: { ticket: true },
        orderBy: { position: 'asc' },
      });

      if (members.length === 0) {
        return reply.code(404).send({ error: 'Cluster not found or has no members' });
      }

      return reply.send({
        clusterCount: members.length,
        members: members.map((m) => ({
          ticketNumber: m.ticket.ticketNumber,
          title: m.ticket.title,
          status: m.ticket.status,
          priority: m.ticket.priority,
          customer: m.ticket.customer,
          location: m.ticket.location,
          similarity: (m.similarityScore * 100).toFixed(1),
          matchingFactors: m.matchingFactors,
          url: `/api/tickets/${m.ticket.id}`,
        })),
      });
    } catch (error) {
      logger.error('List cluster members failed', error as Error);
      return reply.code(500).send({ error: 'Failed to list cluster members' });
    }
  });

  /**
   * [GET] /api/tickets/open/clusters
   * List all active clusters (for NOC dashboard)
   */
  app.get('/open/clusters', async (_req: FastifyRequest, reply: FastifyReply) => {
    try {
      const clusters = await db.ticketCluster.findMany({
        where: {
          status: { in: ['OPEN', 'ESCALATED', 'IN_RESOLUTION'] },
        },
        include: {
          masterTicket: true,
          members: { include: { ticket: true } },
        },
        orderBy: [{ impactScore: 'desc' }, { detectedAt: 'desc' }],
        take: 50,
      });

      return reply.send({
        totalClusters: clusters.length,
        clusters: clusters.map((c) => ({
          clusterId: c.id,
          clusterNumber: c.clusterNumber,
          masterTicket: c.masterTicket.ticketNumber,
          status: c.status,
          severity: c.severity,
          memberCount: c.members.length,
          impactScore: c.impactScore.toFixed(1),
          commonLocation: c.commonLocation,
          commonCustomer: c.commonCustomer,
          commonService: c.commonService,
          detectedAt: c.detectedAt,
          escalatedAt: c.escalatedAt,
          url: `/api/tickets/cluster/${c.id}`,
        })),
      });
    } catch (error) {
      logger.error('List clusters failed', error as Error);
      return reply.code(500).send({ error: 'Failed to list clusters' });
    }
  });

  /**
   * [POST] /api/tickets/cluster/:clusterId/resolve
   * Resolve cluster and cascade to members
   */
  app.post(
    '/cluster/:clusterId/resolve',
    async (req: FastifyRequest<{ Params: { clusterId: string }; Body: { rootCause: string; solution: string } }>, reply: FastifyReply) => {
      try {
        const { clusterId } = req.params;
        const { rootCause, solution } = req.body;
        const actorId = (req.user as { sub?: string } | undefined)?.sub;

        if (!rootCause || !solution) {
          return reply.code(400).send({ error: 'rootCause and solution are required' });
        }

        const cluster = await db.ticketCluster.findUnique({
          where: { id: clusterId },
        });

        if (!cluster) {
          return reply.code(404).send({ error: 'Cluster not found' });
        }

        // Cascade resolution via master ticket
        await clustering.cascadeResolution(cluster.masterTicketId, rootCause, solution, actorId);

        // Get updated cluster
        const updated = await db.ticketCluster.findUnique({
          where: { id: clusterId },
          include: { members: true },
        });

        return reply.send({
          success: true,
          cluster: {
            clusterNumber: updated!.clusterNumber,
            status: updated!.status,
            resolvedAt: updated!.resolvedAt,
            cascadedMembers: updated!.members.length,
          },
        });
      } catch (error) {
        logger.error('Resolve cluster failed', error as Error);
        return reply.code(500).send({ error: 'Failed to resolve cluster' });
      }
    },
  );

  /**
   * [GET] /api/tickets/:ticketId/cluster
   * Check if ticket is part of a cluster
   */
  app.get('/:ticketId/cluster', async (req: FastifyRequest<{ Params: { ticketId: string } }>, reply: FastifyReply) => {
    try {
      const { ticketId } = req.params;

      // Check if ticket is master
      const master = await db.ticketCluster.findFirst({
        where: { masterTicketId: ticketId },
        include: { members: { include: { ticket: true } } },
      });

      if (master) {
        return reply.send({
          role: 'MASTER',
          clusterId: master.id,
          clusterNumber: master.clusterNumber,
          memberCount: master.members.length,
          status: master.status,
          impactScore: master.impactScore,
        });
      }

      // Check if ticket is member
      const member = await db.ticketClusterMember.findFirst({
        where: { ticketId },
        include: { cluster: { include: { masterTicket: true } } },
      });

      if (member) {
        return reply.send({
          role: 'MEMBER',
          clusterId: member.cluster.id,
          clusterNumber: member.cluster.clusterNumber,
          masterTicket: member.cluster.masterTicket.ticketNumber,
          similarity: (member.similarityScore * 100).toFixed(1),
          status: member.cluster.status,
        });
      }

      return reply.code(404).send({
        inCluster: false,
        message: 'Ticket is not part of any cluster',
      });
    } catch (error) {
      logger.error('Get ticket cluster failed', error as Error);
      return reply.code(500).send({ error: 'Failed to get ticket cluster info' });
    }
  });

  /**
   * [GET] /api/tickets/cluster/stats/daily
   * Clustering statistics for dashboard
   */
  app.get('/cluster/stats/daily', async (_req: FastifyRequest, reply: FastifyReply) => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [totalClusters, activeClusters, resolvedClusters, totalMembersInClusters] = await Promise.all([
        db.ticketCluster.count({
          where: { createdAt: { gte: today } },
        }),
        db.ticketCluster.count({
          where: {
            createdAt: { gte: today },
            status: { in: ['OPEN', 'ESCALATED', 'IN_RESOLUTION'] },
          },
        }),
        db.ticketCluster.count({
          where: {
            createdAt: { gte: today },
            status: 'RESOLVED',
          },
        }),
        db.ticketClusterMember.count({
          where: {
            createdAt: { gte: today },
          },
        }),
      ]);

      const avgMembersPerCluster = totalClusters > 0 ? totalMembersInClusters / totalClusters : 0;

      return reply.send({
        date: today.toISOString().split('T')[0],
        metrics: {
          clustersCreated: totalClusters,
          activeClusters,
          resolvedClusters,
          totalMembersGrouped: totalMembersInClusters,
          avgMembersPerCluster: avgMembersPerCluster.toFixed(2),
        },
      });
    } catch (error) {
      logger.error('Get clustering stats failed', error as Error);
      return reply.code(500).send({ error: 'Failed to get clustering stats' });
    }
  });

  logger.info('Clustering API routes registered');
}
