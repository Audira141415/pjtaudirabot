import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { AppContext } from '../app';
import { InsightService } from '@pjtaudirabot/services';

export default async function insightsRoutes(app: FastifyInstance, ctx: AppContext) {
  const insightService = new InsightService(ctx.db, ctx.redis, ctx.logger);
  
  app.get('/predictive', async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const predictions = await insightService.getPredictiveForecast();
      return reply.send({ data: predictions });
    } catch (err) {
      ctx.logger.error('Insights predictive endpoint failed', err as Error);
      return reply.status(500).send({ error: 'Failed to generate predictions' });
    }
  });
}
