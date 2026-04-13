import { PrismaClient } from '@prisma/client';
import { RedisClientType } from 'redis';
import { ILogger } from '@pjtaudirabot/core';
import { GoogleSheetsService } from '../sheets';

export interface CreateMaintenanceScheduleInput {
  title: string;
  description?: string;
  customer?: string;
  location?: string;
  ao?: string;
  sid?: string;
  service?: string;
  hostnameSwitch?: string;
  intervalMonths?: number;   // default 3 (quarterly)
  anchorMonth?: number;      // default 1 (January)
  anchorDay?: number;        // default 1
  reminderEveryMonths?: number; // default 3 (quarterly follow-up reminders)
  notifyDaysBefore?: number; // default 7
  firstDueDate?: Date;       // optional custom first due date
  createdById: string;
}

export interface UpdateMaintenanceScheduleInput {
  title?: string;
  description?: string;
  customer?: string;
  location?: string;
  ao?: string;
  sid?: string;
  service?: string;
  hostnameSwitch?: string;
  intervalMonths?: number;
  anchorMonth?: number;
  anchorDay?: number;
  reminderEveryMonths?: number;
  notifyDaysBefore?: number;
  isActive?: boolean;
}

export interface CompleteMaintenanceScheduleInput {
  note?: string;
  completedAt?: Date;
  evidenceFileId?: string;
  completedBy?: string;
}

export class MaintenanceScheduleService {
  private logger: ILogger;

  constructor(
    private db: PrismaClient,
    private redis: RedisClientType,
    logger: ILogger,
    private sheetsService?: GoogleSheetsService | null,
  ) {
    this.logger = logger.child({ service: 'maintenance-schedule' });
  }

  /** Create a new preventive maintenance schedule */
  async create(input: CreateMaintenanceScheduleInput) {
    const cfg = this.sanitizeScheduleConfig(
      input.intervalMonths,
      input.anchorMonth,
      input.anchorDay,
      input.reminderEveryMonths,
      input.notifyDaysBefore,
    );

    const intervalMonths = cfg.intervalMonths;
    const anchorMonth = cfg.anchorMonth;
    const anchorDay = cfg.anchorDay;
    const firstDueDate = input.firstDueDate ?? this.calculateNextDueDate(new Date(), intervalMonths, anchorMonth, anchorDay);

    const schedule = await this.db.maintenanceSchedule.create({
      data: {
        title: input.title,
        description: input.description,
        customer: input.customer,
        location: input.location,
        ao: input.ao,
        sid: input.sid,
        service: input.service,
        hostnameSwitch: input.hostnameSwitch,
        intervalMonths,
        anchorMonth,
        anchorDay,
        reminderEveryMonths: cfg.reminderEveryMonths,
        notifyDaysBefore: cfg.notifyDaysBefore,
        nextDueDate: firstDueDate,
        createdById: input.createdById,
      },
    });

    this.logger.info('Maintenance schedule created', {
      id: schedule.id,
      title: schedule.title,
      nextDueDate: schedule.nextDueDate,
      intervalMonths: schedule.intervalMonths,
      anchorMonth: schedule.anchorMonth,
      anchorDay: schedule.anchorDay,
    });

    this.sheetsService?.syncMaintenanceSchedule({
      ...schedule,
      lastTicketNumber: null,
      assignedTo: null,
    }).catch(err => {
      this.logger.error(`Failed to sync maintenance schedule ${schedule.id} to sheet`, err);
    });

    return schedule;
  }

  /** List all active maintenance schedules */
  async listActive() {
    return this.db.maintenanceSchedule.findMany({
      where: { isActive: true },
      orderBy: { nextDueDate: 'asc' },
    });
  }

  /** Get all schedules (including inactive) */
  async listAll() {
    return this.db.maintenanceSchedule.findMany({
      orderBy: { nextDueDate: 'asc' },
    });
  }

  async listDashboard(params: { active?: boolean; search?: string } = {}) {
    const where: Record<string, unknown> = {};
    if (params.active !== undefined) {
      where.isActive = params.active;
    }
    if (params.search) {
      where.OR = [
        { title: { contains: params.search, mode: 'insensitive' } },
        { customer: { contains: params.search, mode: 'insensitive' } },
        { location: { contains: params.search, mode: 'insensitive' } },
        { sid: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const [schedules, openTickets] = await Promise.all([
      this.db.maintenanceSchedule.findMany({
        where: where as any,
        include: {
          evidenceFiles: {
            orderBy: { createdAt: 'desc' },
            take: 5,
          },
        },
        orderBy: [
          { nextDueDate: 'asc' },
          { title: 'asc' },
        ],
      }),
      this.db.ticket.findMany({
        where: {
          category: 'MAINTENANCE',
          status: { in: ['OPEN', 'IN_PROGRESS', 'WAITING', 'ESCALATED'] },
        },
        select: {
          id: true,
          ticketNumber: true,
          status: true,
          createdAt: true,
          tags: true,
        },
      }),
    ]);

    const openTicketMap = new Map<string, { id: string; ticketNumber: string; status: string; createdAt: Date }>();
    for (const ticket of openTickets) {
      const tags = Array.isArray(ticket.tags) ? ticket.tags as string[] : [];
      const scheduleTag = tags.find((tag) => typeof tag === 'string' && tag.startsWith('schedule:'));
      if (!scheduleTag) continue;
      const existing = openTicketMap.get(scheduleTag);
      if (!existing || ticket.createdAt > existing.createdAt) {
        openTicketMap.set(scheduleTag, {
          id: ticket.id,
          ticketNumber: ticket.ticketNumber,
          status: String(ticket.status),
          createdAt: ticket.createdAt,
        });
      }
    }

    return schedules.map((schedule) => ({
      ...schedule,
      openTicket: openTicketMap.get(`schedule:${schedule.id}`) ?? null,
    }));
  }

  async updateSchedule(id: string, input: UpdateMaintenanceScheduleInput) {
    const current = await this.db.maintenanceSchedule.findUnique({ where: { id } });
    if (!current) {
      throw new Error('Maintenance schedule not found');
    }

    const cfg = this.sanitizeScheduleConfig(
      input.intervalMonths ?? current.intervalMonths,
      input.anchorMonth ?? current.anchorMonth,
      input.anchorDay ?? current.anchorDay,
      input.reminderEveryMonths ?? current.reminderEveryMonths,
      input.notifyDaysBefore ?? current.notifyDaysBefore,
    );

    const cadenceChanged =
      cfg.intervalMonths !== current.intervalMonths ||
      cfg.anchorMonth !== current.anchorMonth ||
      cfg.anchorDay !== current.anchorDay;

    const updated = await this.db.maintenanceSchedule.update({
      where: { id },
      data: {
        title: input.title ?? current.title,
        description: input.description ?? current.description,
        customer: input.customer ?? current.customer,
        location: input.location ?? current.location,
        ao: input.ao ?? current.ao,
        sid: input.sid ?? current.sid,
        service: input.service ?? current.service,
        hostnameSwitch: input.hostnameSwitch ?? current.hostnameSwitch,
        intervalMonths: cfg.intervalMonths,
        anchorMonth: cfg.anchorMonth,
        anchorDay: cfg.anchorDay,
        reminderEveryMonths: cfg.reminderEveryMonths,
        notifyDaysBefore: cfg.notifyDaysBefore,
        isActive: input.isActive ?? current.isActive,
        nextDueDate: cadenceChanged
          ? this.calculateNextDueDate(new Date(), cfg.intervalMonths, cfg.anchorMonth, cfg.anchorDay)
          : current.nextDueDate,
      },
      include: {
        evidenceFiles: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    });

    this.sheetsService?.syncMaintenanceSchedule({
      ...updated,
      lastTicketNumber: null,
      assignedTo: null,
    }).catch(err => {
      this.logger.error(`Failed to sync maintenance schedule ${id} to sheet`, err);
    });

    this.logger.info('Maintenance schedule updated', { id, cadenceChanged });
    return updated;
  }

  async completeSchedule(id: string, input: CompleteMaintenanceScheduleInput = {}) {
    const schedule = await this.db.maintenanceSchedule.findUnique({ where: { id } });
    if (!schedule) {
      throw new Error('Maintenance schedule not found');
    }

    const cfg = this.sanitizeScheduleConfig(
      schedule.intervalMonths,
      schedule.anchorMonth,
      schedule.anchorDay,
      schedule.reminderEveryMonths,
      schedule.notifyDaysBefore,
    );
    const completedAt = input.completedAt ?? new Date();
    const nextDueDate = this.calculateNextDueDate(completedAt, cfg.intervalMonths, cfg.anchorMonth, cfg.anchorDay);
    const scheduleTag = `schedule:${schedule.id}`;
    const completionNote = input.note?.trim() || `Maintenance ${schedule.title} selesai via dashboard.`;

    const openTickets = await this.db.ticket.findMany({
      where: {
        category: 'MAINTENANCE',
        status: { in: ['OPEN', 'IN_PROGRESS', 'WAITING', 'ESCALATED'] },
        tags: { array_contains: [scheduleTag] },
      },
      select: {
        id: true,
        status: true,
        createdAt: true,
      },
    });

    const updated = await this.db.$transaction(async (tx) => {
      for (const ticket of openTickets) {
        await tx.ticket.update({
          where: { id: ticket.id },
          data: {
            status: 'RESOLVED',
            resolvedAt: completedAt,
            rootCause: 'Preventive maintenance completed',
            solution: input.evidenceFileId
              ? `${completionNote}\nEvidence file: ${input.evidenceFileId}`
              : completionNote,
          },
        });

        const resolutionTimeMin = (completedAt.getTime() - ticket.createdAt.getTime()) / 60_000;
        await tx.sLATracking.updateMany({
          where: { ticketId: ticket.id, resolvedAt: null },
          data: {
            resolvedAt: completedAt,
            resolutionTimeMin: Math.round(resolutionTimeMin * 10) / 10,
            resolutionBreached: false,
          },
        });

        await tx.ticketHistory.create({
          data: {
            ticketId: ticket.id,
            action: 'maintenance_completed',
            note: completionNote,
            changedById: input.completedBy,
          },
        });
      }

      return tx.maintenanceSchedule.update({
        where: { id },
        data: {
          lastMaintainedAt: completedAt,
          lastMaintenanceTicketId: openTickets[0]?.id ?? schedule.lastTicketId ?? schedule.lastMaintenanceTicketId,
          lastCompletionNote: completionNote,
          nextDueDate,
        },
        include: {
          evidenceFiles: {
            orderBy: { createdAt: 'desc' },
            take: 5,
          },
        },
      });
    });

    this.logger.info('Maintenance schedule completed manually', {
      id,
      resolvedTickets: openTickets.length,
      nextDueDate,
    });
    return updated;
  }

  /** Deactivate a schedule */
  async deactivate(id: string) {
    return this.db.maintenanceSchedule.update({
      where: { id },
      data: { isActive: false },
    });
  }

  /** Re-activate a schedule */
  async activate(id: string) {
    return this.db.maintenanceSchedule.update({
      where: { id },
      data: { isActive: true },
    });
  }

  /**
   * Check all active schedules daily.
   * Returns two arrays:
   *  - dueTickets: schedules whose nextDueDate has arrived → auto-creates ticket
   *  - reminders: schedules within the notifyDaysBefore window  
   */
  async checkDue(createTicketFn: (opts: {
    title: string;
    description: string;
    problem: string;
    customer?: string;
    location?: string;
    ao?: string;
    sid?: string;
    service?: string;
    hostnameSwitch?: string;
    category: 'MAINTENANCE';
    priority: 'MEDIUM';
    createdById: string;
    tags: string[];
  }) => Promise<{ ticketNumber: string; id: string }>): Promise<{
    dueTickets: string[];
    reminders: string[];
    quarterlyReminders: string[];
    syncedCompleted: number;
  }> {
    const dueTickets: string[] = [];
    const reminders: string[] = [];
    const quarterlyReminders: string[] = [];
    const now = new Date();

    const syncedCompleted = await this.syncCompletedMaintenance(now);

    const schedules = await this.db.maintenanceSchedule.findMany({
      where: { isActive: true },
    });

    for (const s of schedules) {
      const cfg = this.sanitizeScheduleConfig(
        s.intervalMonths,
        s.anchorMonth,
        s.anchorDay,
        s.reminderEveryMonths,
        s.notifyDaysBefore,
      );
      const scheduleTag = `schedule:${s.id}`;
      const lockKey = `maintenance:schedule:lock:${s.id}`;
      const lockToken = `${process.pid}:${Date.now()}:${Math.random().toString(36).slice(2)}`;
      const lockAcquired = await this.redis.set(lockKey, lockToken, { NX: true, PX: 10 * 60 * 1000 });
      if (!lockAcquired) {
        continue;
      }

      try {
        const dueMs = s.nextDueDate.getTime() - now.getTime();
        const dueDays = dueMs / (1000 * 60 * 60 * 24);
        let createdTicketNumber: string | null = null;

        const openTicket = await this.db.ticket.findFirst({
          where: {
            category: 'MAINTENANCE',
            tags: { array_contains: [scheduleTag] },
            status: { in: ['OPEN', 'IN_PROGRESS', 'WAITING', 'ESCALATED'] },
          },
          orderBy: { createdAt: 'desc' },
          select: { id: true, ticketNumber: true, createdAt: true },
        });

        if (dueMs <= 0) {
          const cycleTag = `cycle:${this.formatDateKey(s.nextDueDate)}`;
          const existingCycleTicket = await this.db.ticket.findFirst({
            where: {
              category: 'MAINTENANCE',
              tags: { array_contains: [scheduleTag, cycleTag] },
            },
            orderBy: { createdAt: 'desc' },
            select: { id: true, ticketNumber: true },
          });

          if (existingCycleTicket) {
            // Self-heal: ticket for this cycle already exists, so only advance schedule state.
            const updatedNextDue = this.calculateNextDueDate(now, cfg.intervalMonths, cfg.anchorMonth, cfg.anchorDay);
            const updatedSchedule = await this.db.maintenanceSchedule.update({
              where: { id: s.id },
              data: {
                nextDueDate: updatedNextDue,
                lastTicketId: existingCycleTicket.id,
                lastCreatedAt: now,
              },
            });

            this.sheetsService?.syncMaintenanceSchedule(updatedSchedule).catch(() => {});
          } else if (!openTicket) {
            // Due date reached — create ticket only if none is currently open.
            try {
              const intervalLabel = this.intervalLabel(cfg.intervalMonths);
              const ticket = await createTicketFn({
                title: `[PM] ${s.title}`,
                description: `Jadwal Preventive Maintenance ${intervalLabel} untuk ${s.customer ?? s.title}.\n\n${s.description ?? ''}`.trim(),
                problem: `Preventive Maintenance terjadwal (${intervalLabel}) — ${s.title}`,
                customer: s.customer ?? undefined,
                location: s.location ?? undefined,
                ao: s.ao ?? undefined,
                sid: s.sid ?? undefined,
                service: s.service ?? undefined,
                hostnameSwitch: s.hostnameSwitch ?? undefined,
                category: 'MAINTENANCE',
                priority: 'MEDIUM',
                createdById: s.createdById,
                tags: [
                  'preventive-maintenance',
                  'scheduled',
                  intervalLabel.toLowerCase(),
                  scheduleTag,
                  cycleTag,
                ],
              });
              createdTicketNumber = ticket.ticketNumber;

              // Advance nextDueDate using January-anchored cycle.
              const nextDue = this.calculateNextDueDate(now, cfg.intervalMonths, cfg.anchorMonth, cfg.anchorDay);
              await this.db.maintenanceSchedule.update({
                where: { id: s.id },
                data: {
                  nextDueDate: nextDue,
                  lastCreatedAt: now,
                  lastTicketId: ticket.id,
                },
              });

              dueTickets.push(
                `━━━━━━━━━━━━━━━━━━━━━━\n` +
                `🔔 *JADWAL PM — TIKET DIBUAT*\n` +
                `━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                `📋 *Jadwal*    : ${s.title}\n` +
                `📝 *Deskripsi* : ${s.description ?? '-'}\n` +
                `📍 *Lokasi*    : ${s.location ?? '-'}\n` +
                `🔁 *Interval*  : ${intervalLabel}\n\n` +
                `🎫 *No. Tiket* : ${ticket.ticketNumber}\n` +
                `📅 *Prioritas* : MEDIUM\n` +
                `⏰ *Jatuh Tempo Berikutnya* : ${this.formatDate(nextDue)}\n\n` +
                `✅ _Silakan kerjakan dan update tiket setelah PM selesai dilakukan._`
              );

              this.logger.info('Maintenance ticket auto-created', {
                scheduleId: s.id,
                ticketNumber: ticket.ticketNumber,
                nextDueDate: nextDue,
              });
            } catch (err) {
              this.logger.error('Failed to auto-create maintenance ticket', err as Error, { scheduleId: s.id });
            }
          }
        } else if (dueDays <= cfg.notifyDaysBefore) {
          // Within reminder window
          const daysLeft = Math.ceil(dueDays);
          reminders.push(
            `━━━━━━━━━━━━━━━━━━━━━━\n` +
            `⚠️ *REMINDER PM — ${daysLeft} HARI LAGI*\n` +
            `━━━━━━━━━━━━━━━━━━━━━━\n\n` +
            `📋 *Jadwal*    : ${s.title}\n` +
            `📝 *Deskripsi* : ${s.description ?? '-'}\n` +
            `📍 *Lokasi*    : ${s.location ?? '-'}\n` +
            `🔁 *Interval*  : ${this.intervalLabel(cfg.intervalMonths)}\n\n` +
            `⏰ *Jatuh Tempo* : ${this.formatDate(s.nextDueDate)}\n` +
            `⏳ *Sisa Waktu*  : *${daysLeft} hari lagi*\n\n` +
            `📌 _Segera persiapkan jadwal dan tim pelaksana PM._`
          );
        }

        // Quarterly (or custom cadence) follow-up reminder for overdue items.
        if (await this.shouldRunPeriodicReminder(s.id, now, cfg.reminderEveryMonths, cfg.anchorMonth, cfg.anchorDay)) {
          const overdueDays = Math.max(0, Math.ceil((now.getTime() - s.nextDueDate.getTime()) / (1000 * 60 * 60 * 24)));
          if (overdueDays > 0) {
            if (openTicket) {
              quarterlyReminders.push(
                `━━━━━━━━━━━━━━━━━━━━━━\n` +
                `🚨 *MAINTENANCE OVERDUE*\n` +
                `━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                `📋 *Jadwal*    : ${s.title}\n` +
                `📝 *Deskripsi* : ${s.description ?? '-'}\n` +
                `📍 *Lokasi*    : ${s.location ?? '-'}\n` +
                `🔁 *Interval*  : ${this.intervalLabel(cfg.intervalMonths)}\n\n` +
                `🎫 *No. Tiket* : ${openTicket.ticketNumber} _(masih terbuka)_\n` +
                `⏳ *Overdue*   : *${overdueDays} hari*\n\n` +
                `⚠️ _Mohon teknisi segera memperbarui progress atau menyelesaikan tiket PM ini!_`
              );
            } else if (!createdTicketNumber) {
              try {
                const ticket = await createTicketFn({
                  title: `[PM FOLLOW-UP] ${s.title}`,
                  description: `Follow-up triwulan: item maintenance ini melewati jadwal sejak ${this.formatDate(s.nextDueDate)}.`,
                  problem: `Maintenance overdue ${overdueDays} hari — ${s.title}`,
                  customer: s.customer ?? undefined,
                  location: s.location ?? undefined,
                  ao: s.ao ?? undefined,
                  sid: s.sid ?? undefined,
                  service: s.service ?? undefined,
                  hostnameSwitch: s.hostnameSwitch ?? undefined,
                  category: 'MAINTENANCE',
                  priority: 'MEDIUM',
                  createdById: s.createdById,
                  tags: ['preventive-maintenance', 'follow-up', scheduleTag],
                });
                await this.db.maintenanceSchedule.update({
                  where: { id: s.id },
                  data: {
                    lastCreatedAt: now,
                    lastTicketId: ticket.id,
                  },
                });
                quarterlyReminders.push(
                  `━━━━━━━━━━━━━━━━━━━━━━\n` +
                  `🚨 *MAINTENANCE OVERDUE — TIKET BARU DIBUAT*\n` +
                  `━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                  `📋 *Jadwal*    : ${s.title}\n` +
                  `📝 *Deskripsi* : ${s.description ?? '-'}\n` +
                  `📍 *Lokasi*    : ${s.location ?? '-'}\n` +
                  `🔁 *Interval*  : ${this.intervalLabel(cfg.intervalMonths)}\n\n` +
                  `🎫 *No. Tiket* : ${ticket.ticketNumber} _(follow-up)_\n` +
                  `⏳ *Overdue*   : *${overdueDays} hari*\n\n` +
                  `⚠️ _PM ini sudah melewati jadwal. Mohon segera tindaklanjuti!_`
                );
              } catch (err) {
                this.logger.error('Failed to create quarterly follow-up ticket', err as Error, { scheduleId: s.id });
              }
            }
          }
        }
      } finally {
        await this.releaseDistributedLock(lockKey, lockToken);
      }
    }

    return { dueTickets, reminders, quarterlyReminders, syncedCompleted };
  }

  /** Get upcoming schedules within the next N days */
  async getUpcoming(days = 30) {
    const now = new Date();
    const until = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    return this.db.maintenanceSchedule.findMany({
      where: {
        isActive: true,
        nextDueDate: { lte: until },
      },
      orderBy: { nextDueDate: 'asc' },
    });
  }

  private addMonths(date: Date, months: number): Date {
    const result = new Date(date);
    result.setMonth(result.getMonth() + months);
    return result;
  }

  private calculateNextDueDate(fromDate: Date, intervalMonths: number, anchorMonth = 1, anchorDay = 1): Date {
    let cursor = new Date(fromDate.getFullYear(), anchorMonth - 1, anchorDay, 9, 0, 0, 0);
    while (cursor <= fromDate) {
      cursor = this.addMonths(cursor, intervalMonths);
    }
    return cursor;
  }

  private async shouldRunPeriodicReminder(
    scheduleId: string,
    now: Date,
    cadenceMonths: number,
    anchorMonth: number,
    anchorDay: number,
  ): Promise<boolean> {
    const monthIndex = now.getMonth() + 1;
    const monthDelta = (monthIndex - anchorMonth + 12) % 12;
    const isCadenceMonth = monthDelta % Math.max(1, cadenceMonths) === 0;
    const isDayReached = now.getDate() >= anchorDay;

    if (!isCadenceMonth || !isDayReached) {
      return false;
    }

    // De-dup reminder per schedule + cadence window.
    const period = `${now.getFullYear()}-${Math.floor(monthDelta / Math.max(1, cadenceMonths))}`;
    const lockKey = `maintenance:reminder:${scheduleId}:${cadenceMonths}:${period}`;
    const acquired = await this.redis.set(lockKey, '1', { NX: true, PX: 35 * 24 * 60 * 60 * 1000 });
    return !!acquired;
  }

  private async syncCompletedMaintenance(now: Date): Promise<number> {
    const schedules = await this.db.maintenanceSchedule.findMany({ where: { isActive: true } });
    let synced = 0;

    for (const s of schedules) {
      const scheduleTag = `schedule:${s.id}`;
      const completedTickets = await this.db.ticket.findMany({
        where: {
          category: 'MAINTENANCE',
          tags: { array_contains: [scheduleTag] },
          status: { in: ['RESOLVED', 'CLOSED'] },
        },
        select: {
          id: true,
          ticketNumber: true,
          resolvedAt: true,
          closedAt: true,
          updatedAt: true,
        },
      });

      if (completedTickets.length === 0) continue;

      const completedTicket = completedTickets.reduce((latest, current) => {
        const latestAt = latest.resolvedAt ?? latest.closedAt ?? latest.updatedAt;
        const currentAt = current.resolvedAt ?? current.closedAt ?? current.updatedAt;
        return currentAt > latestAt ? current : latest;
      });

      const completedAt = completedTicket.resolvedAt ?? completedTicket.closedAt ?? completedTicket.updatedAt;
      if (!s.lastMaintainedAt || completedAt > s.lastMaintainedAt) {
        await this.db.maintenanceSchedule.update({
          where: { id: s.id },
          data: {
            lastMaintainedAt: completedAt,
            lastMaintenanceTicketId: completedTicket.id,
          },
        });
        synced += 1;
      }
    }

    if (synced > 0) {
      this.logger.info('Maintenance completion sync updated', { synced, at: now.toISOString() });
    }
    return synced;
  }

  private sanitizeScheduleConfig(
    intervalMonths?: number,
    anchorMonth?: number,
    anchorDay?: number,
    reminderEveryMonths?: number,
    notifyDaysBefore?: number,
  ) {
    const safeInterval = this.normalizePositiveInt(intervalMonths, 3);
    const normalizedAnchorMonth = Math.min(12, Math.max(1, this.normalizePositiveInt(anchorMonth, 1)));
    const safeAnchorMonth = 1; // enforce January cycle as requested
    const safeAnchorDay = Math.min(31, Math.max(1, this.normalizePositiveInt(anchorDay, 1)));
    const safeReminderCadence = this.normalizePositiveInt(reminderEveryMonths, 3);
    const safeNotifyDaysBefore = Math.min(60, Math.max(1, this.normalizePositiveInt(notifyDaysBefore, 7)));

    if (normalizedAnchorMonth !== 1) {
      this.logger.warn('anchorMonth overridden to January (1) to keep yearly cycle consistent');
    }

    return {
      intervalMonths: safeInterval,
      anchorMonth: safeAnchorMonth,
      anchorDay: safeAnchorDay,
      reminderEveryMonths: safeReminderCadence,
      notifyDaysBefore: safeNotifyDaysBefore,
    };
  }

  private normalizePositiveInt(value: number | undefined, fallback: number): number {
    if (value == null) return fallback;
    const normalized = Math.floor(value);
    if (!Number.isFinite(normalized) || normalized <= 0) return fallback;
    return normalized;
  }

  private async releaseDistributedLock(lockKey: string, lockToken: string): Promise<void> {
    await this.redis.eval(
      'if redis.call("GET", KEYS[1]) == ARGV[1] then return redis.call("DEL", KEYS[1]) else return 0 end',
      {
        keys: [lockKey],
        arguments: [lockToken],
      },
    ).catch(() => {});
  }

  private formatDateKey(date: Date): string {
    return date.toISOString().slice(0, 10);
  }

  private formatDate(date: Date): string {
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  private intervalLabel(months: number): string {
    const map: Record<number, string> = {
      1: 'Bulanan',
      2: '2 Bulanan',
      3: 'Triwulan (3 Bulan)',
      6: 'Semesteran',
      12: 'Tahunan',
    };
    return map[months] ?? `Per ${months} Bulan`;
  }
  /**
   * Resync all maintenance schedules to Google Sheets.
   */
  async syncAllToSheets(): Promise<number> {
    if (!this.sheetsService) return 0;
    const schedules = await this.db.maintenanceSchedule.findMany({
      orderBy: { createdAt: 'asc' },
    });

    // Collect unique lastTicketIds to resolve ticket numbers in batch
    const ticketIds = [...new Set(schedules.map(s => s.lastTicketId).filter(Boolean))] as string[];
    const tickets = ticketIds.length > 0
      ? await this.db.ticket.findMany({
          where: { id: { in: ticketIds } },
          select: { id: true, ticketNumber: true, assignedToId: true },
        })
      : [];
    const ticketMap = new Map(tickets.map(t => [t.id, t]));

    let count = 0;
    for (const schedule of schedules) {
      const lastTicket = schedule.lastTicketId ? ticketMap.get(schedule.lastTicketId) : null;
      await this.sheetsService.syncMaintenanceSchedule({
        ...schedule,
        lastTicketNumber: lastTicket?.ticketNumber ?? null,
        assignedTo: lastTicket?.assignedToId ?? null,
      }).catch(() => {});
      count++;
    }
    return count;
  }

  /** Delete a single maintenance schedule and remove its row from Google Sheets. */
  async delete(id: string): Promise<void> {
    const schedule = await this.db.maintenanceSchedule.findUnique({ where: { id } });
    if (!schedule) throw new Error(`Maintenance schedule ${id} not found`);

    // Delete evidence files first (FK constraint)
    await this.db.mediaFile.deleteMany({ where: { maintenanceScheduleId: id } });
    await this.db.maintenanceSchedule.delete({ where: { id } });

    // Remove row from Google Sheets
    if (this.sheetsService) {
      await this.sheetsService.deleteMaintenanceRow(id).catch(() => {});
    }

    this.logger.info('Maintenance schedule deleted', { id, title: schedule.title });
  }

  /** Delete multiple maintenance schedules at once. Returns count of deleted items. */
  async deleteMany(ids: string[]): Promise<number> {
    if (ids.length === 0) return 0;
    await this.db.mediaFile.deleteMany({ where: { maintenanceScheduleId: { in: ids } } });
    const result = await this.db.maintenanceSchedule.deleteMany({ where: { id: { in: ids } } });

    // Refresh sheet after bulk delete
    if (this.sheetsService) {
      await this.clearAndResyncSheets().catch(() => {});
    }

    this.logger.info('Maintenance schedules bulk-deleted', { count: result.count });
    return result.count;
  }

  /** Clear all rows (excluding header) in the maintenance_schedules sheet, then resync DB → Sheet. */
  async clearAndResyncSheets(): Promise<number> {
    if (!this.sheetsService) return 0;
    await this.sheetsService.clearMaintenanceSheet();
    return this.syncAllToSheets();
  }
}

