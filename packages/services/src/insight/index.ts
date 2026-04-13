import { PrismaClient } from '@prisma/client';
import { RedisClientType } from 'redis';
import { ILogger } from '@pjtaudirabot/core';
import { NEUCENTRIX_LOCATIONS } from '../data/neucentrix-locations';

export interface MaintenancePrediction {
  id: string;
  type: string;
  location: string;
  probability: number;
  reason: string;
  recommendation: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export class InsightService {
  private logger: ILogger;

  constructor(
    private db: PrismaClient,
    private redis: RedisClientType,
    logger: ILogger
  ) {
    this.logger = logger.child({ service: 'insights' });
    // Use redis if needed in future (e.g. caching)
    if (this.redis) { /* initialized */ }
  }

  /**
   * Generates predictive maintenance forecasts based on historical ticket trends
   * and maintenance schedules.
   */
  async getPredictiveForecast(): Promise<MaintenancePrediction[]> {
    try {
      // 1. Fetch historical ticket data for analysis (last 6 months)
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const [tickets, schedules] = await Promise.all([
        this.db.ticket.findMany({
          where: { createdAt: { gte: sixMonthsAgo } },
          select: { title: true, problem: true, location: true, createdAt: true, category: true },
        }),
        this.db.maintenanceSchedule.findMany({
          where: { isActive: true },
          select: { title: true, location: true, nextDueDate: true, lastMaintainedAt: true, intervalMonths: true },
        }),
      ]);

      const predictions: MaintenancePrediction[] = [];
      const now = new Date();
      const currentMonth = now.getMonth();

      // --- Logic 1: Seasonal Temperature Analysis ---
      const tempRelatedKeywords = ['temp', 'suhu', 'ac', 'cooling', 'overheat', 'panas'];
      const targetLocations = NEUCENTRIX_LOCATIONS.map(l => l.fullName);

      for (const loc of targetLocations) {
        const locTickets = tickets.filter((t: any) => t.location === loc);
        const tempIssues = locTickets.filter((t: any) => 
          tempRelatedKeywords.some(k => (t.title || '').toLowerCase().includes(k) || (t.problem || '').toLowerCase().includes(k))
        );

        const isSeasonPeak = [3, 4, 5].includes(currentMonth); // April, May, June
        
        if (tempIssues.length > 2 || (isSeasonPeak && tempIssues.length > 0)) {
          predictions.push({
            id: `pred-temp-${loc.replace(/\s+/g, '-').toLowerCase()}`,
            type: 'Thermal Stress Risk',
            location: loc,
            probability: isSeasonPeak ? 85 : 60,
            reason: `Detected ${tempIssues.length} cooling incidents in the last 6 months. Seasonal patterns indicate rising ambient temperatures.`,
            recommendation: 'Perform immediate cleaning of AC condenser units and verify refrigerant levels.',
            severity: isSeasonPeak ? 'high' : 'medium',
          });
        }
      }

      // --- Logic 2: Maintenance Gap Analysis ---
      for (const schedule of (schedules as any[])) {
        if (!schedule.location) continue;

        const overdueDays = schedule.nextDueDate < now 
          ? Math.floor((now.getTime() - schedule.nextDueDate.getTime()) / (1000 * 86400))
          : 0;
        
        if (overdueDays > 7) {
          predictions.push({
            id: `pred-maint-${schedule.location.replace(/\s+/g, '-').toLowerCase()}`,
            type: 'Infrastructure Fatigue',
            location: schedule.location,
            probability: Math.min(95, 70 + overdueDays),
            reason: `Maintenance "${schedule.title}" is overdue by ${overdueDays} days. Component wear risk is increasing.`,
            recommendation: `Execute pending PM for ${schedule.title} within 48 hours to prevent cascading failures.`,
            severity: overdueDays > 14 ? 'critical' : 'high',
          });
        }
      }

      // --- Logic 3: Power Fluctuation Trends ---
      const powerKeywords = ['ups', 'pln', 'listrik', 'power', 'genset', 'voltage'];
      for (const loc of targetLocations) {
        const powerIssues = tickets.filter((t: any) => 
          t.location === loc && powerKeywords.some(k => (t.title || '').toLowerCase().includes(k))
        );

        if (powerIssues.length >= 3) {
          predictions.push({
            id: `pred-pwr-${loc.replace(/\s+/g, '-').toLowerCase()}`,
            type: 'Power Stability Warning',
            location: loc,
            probability: 75,
            reason: `Anomalous frequency of power-related tickets (${powerIssues.length} incidents) in recent months.`,
            recommendation: 'Run an endurance test on UPS batteries and inspect ATS contactors.',
            severity: 'high',
          });
        }
      }

      if (predictions.length === 0) {
        predictions.push({
          id: 'pred-default-1',
          type: 'Standard Preventive Advisory',
          location: 'All Data Centers',
          probability: 10,
          reason: 'General infrastructure health within normal parameters.',
          recommendation: 'Continue following the established PM calendar.',
          severity: 'low',
        });
      }

      return predictions.sort((a, b) => b.probability - a.probability);
    } catch (err) {
      this.logger.error('Failed to generate predictive forecast', err as Error);
      return [];
    }
  }
}
