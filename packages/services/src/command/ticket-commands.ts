import { CommandContext, CommandResult, ILogger } from '@pjtaudirabot/core';
import { BaseCommandHandler } from './handler';
import { TicketService } from '../ticket';
import { SLAService } from '../sla';
import { CRMService } from '../crm';
import { GoogleSheetsService } from '../sheets';

/** Payload sent to the new-ticket broadcast callback */
export interface NewTicketBroadcast {
  id: string;
  ticketNumber: string;
  title: string;
  priority: string;
  category: string;
  problem?: string;
  alokasi?: string;
  vlanId?: string;
  customer?: string;
  createdByName: string;
  groupId?: string | null;
  technicalDetails?: string;
  customerServices?: string[]; // ["VLAN 100: IPTX", "VLAN 200: METRO"]
}

export interface TicketPickedBroadcast {
  ticketNumber: string;
  title: string;
  priority: string;
  handlerName: string;
  responseTimeMin?: number;
  responseBreached?: boolean;
  resolutionRemainingMin?: number;
}

export interface TicketResolvedBroadcast {
  ticketNumber: string;
  title: string;
  priority: string;
  resolvedByName: string;
  rootCause: string;
  solution: string;
}

import { DataExtractionService } from '../data-extraction';

export class TicketCreateCommand extends BaseCommandHandler {
  constructor(
    logger: ILogger,
    private ticketService: TicketService,
    private slaService: SLAService,
    private dataExtractionService: DataExtractionService,
    private crmService?: CRMService | null,
    private sheetsService?: GoogleSheetsService | null,
    private onCreated?: (params: NewTicketBroadcast) => Promise<void>,
  ) {
    super(logger);
  }

  getName(): string { return 'ticket'; }
  getDescription(): string { return 'Create a new support ticket (!ticket <title> | <problem>)'; }
  getCategory(): string { return 'ticket'; }

  async execute(context: CommandContext): Promise<CommandResult> {
    const args = context.input.replace(/^!ticket\s+/i, '').trim();
    if (!args) {
      return this.createResult(false, '❌ Usage: !ticket <title> | <description>\nExample: !ticket Link down customer XYZ | Internet tidak bisa diakses');
    }

    const parts = args.split('|').map((s) => s.trim());
    const title = parts[0];
    const problem = parts[1] ?? parts[0];

    // Auto-extract technical details from the input text
    const extraction = this.dataExtractionService.extract(args);
    const { 
      location, customer: extractedCustomer, ao, sid, service, 
      vlanId, vlanType, vlanName, hostnameSwitch, port, 
      ipAddress, gateway, subnet, mode 
    } = extraction.data;

    try {
      const ticket = await this.ticketService.create({
        createdById: context.user.id,
        title,
        description: args,
        problem,
        source: context.platform === 'whatsapp' ? 'WHATSAPP' : 'TELEGRAM',
        groupId: context.groupId,
        sourceMessage: context.input,
        // Enriched technical details
        location,
        customer: extractedCustomer || undefined,
        ao, sid, service, vlanId, vlanType, vlanName,
        hostnameSwitch, port, ipAddress, gateway, subnet, mode
      });

      // Start SLA tracking
      await this.slaService.startTracking(ticket.id, ticket.priority, ticket.category, problem);

      // Enrich with CRM Assets if possible
      let customerServices: string[] | undefined;
      const finalCustomer = ticket.customer || extractedCustomer;
      if (this.crmService && finalCustomer) {
        try {
          const contact = await this.crmService.findContactWithAssets(finalCustomer);
          if (contact && contact.assets.length > 0) {
            customerServices = contact.assets.map(a => {
              const type = a.type || 'VLAN';
              const name = a.serviceType ? ` — [${a.serviceType}]` : '';
              return `${type} ${a.identifier}${name}`;
            });
          }
        } catch (err) {
          this.logger.warn('Failed to fetch CRM assets for notification enrichment', err as Error);
        }
      }

      // Broadcast new ticket to admin groups (non-blocking)
      if (this.onCreated) {
        this.onCreated({
          id: ticket.id,
          ticketNumber: ticket.ticketNumber,
          title: ticket.title,
          priority: ticket.priority,
          category: ticket.category,
          problem,
          createdByName: context.user.displayName ?? context.user.phoneNumber ?? 'Unknown',
          groupId: ticket.groupId,
          customerServices,
          customer: finalCustomer || undefined,
          technicalDetails: args, // Provide the full context for formatting
          alokasi: ticket.hostnameSwitch && ticket.port ? `${ticket.hostnameSwitch} / ${ticket.port}` : undefined,
          vlanId: ticket.vlanId || undefined,
        });
      }
      if (this.sheetsService?.isAvailable()) {
        this.sheetsService.syncTicket({
          id: ticket.id,
          ticketNumber: ticket.ticketNumber,
          problem,
          priority: ticket.priority,
          category: ticket.category,
          status: ticket.status,
          createdBy: context.user.displayName,
          createdAt: ticket.createdAt,
        }).catch((err) => this.logger.error('GSheet syncTicket (create) failed', err as Error));
      }

      return this.createResult(true, [
        `⚡ *AUDI NOC SYSTEMS — TICKET INITIALIZED*`,
        `━━━━━━━━━━━━━━━━━━━━`,
        `🎫 *ID:* [${ticket.ticketNumber}]`,
        `👤 *SENDER:* [${context.user.displayName ?? 'System'}]`,
        `━━━━━━━━━━━━━━━━━━━━`,
        `📊 *VITAL STATS*`,
        `• Title: ${ticket.title}`,
        `• Priority: 🎯 ${ticket.priority}`,
        `• Category: 📁 ${ticket.category}`,
        `• Status: 🔋 ACTIVE TRACKING`,
        ``,
        `⏱️ *SLA MONITORING:* [STARTED]`,
        `_Gunakan !ticket-status ${ticket.ticketNumber} untuk pembaruan real-time._`,
      ].join('\n'), { ticketNumber: ticket.ticketNumber });
    } catch (error) {
      this.logger.error('Ticket creation failed', error as Error);
      return this.createErrorResult('Failed to create ticket');
    }
  }
}

export class TicketStatusCommand extends BaseCommandHandler {
  constructor(logger: ILogger, private ticketService: TicketService) {
    super(logger);
  }

  getName(): string { return 'ticket-status'; }
  getDescription(): string { return 'Check ticket status (!ticket-status <ticket-number>)'; }
  getCategory(): string { return 'ticket'; }

  async execute(context: CommandContext): Promise<CommandResult> {
    const ticketNumber = context.input.replace(/^!ticket-status\s+/i, '').trim();
    if (!ticketNumber) {
      return this.createResult(false, '❌ Usage: !ticket-status <ticket-number>\nExample: !ticket-status TKT-20250405-0001');
    }

    try {
      const ticket = await this.ticketService.findByNumber(ticketNumber.toUpperCase());
      if (!ticket) return this.createResult(false, `❌ Ticket ${ticketNumber} not found`);

      const sla = ticket.slaTracking;
      const lines = [
        `📋 *${ticket.ticketNumber}*`,
        `📝 ${ticket.title}`,
        `📊 Status: *${ticket.status}*`,
        `🔴 Priority: ${ticket.priority}`,
        `📂 Category: ${ticket.category}`,
        ticket.customer ? `👤 Customer: ${ticket.customer}` : null,
        ticket.location ? `📍 Location: ${ticket.location}` : null,
        ticket.assignedTo ? `👷 Assigned: ${ticket.assignedTo.displayName ?? ticket.assignedTo.phoneNumber}` : `👷 Assigned: _Unassigned_`,
        sla ? `⏱️ Response: ${sla.respondedAt ? `${Math.round(sla.responseTimeMin ?? 0)}min ${sla.responseBreached ? '🔴' : '🟢'}` : `pending (${Math.round((sla.responseDeadline.getTime() - Date.now()) / 60000)}min left)`}` : null,
        sla ? `⏱️ Resolution: ${sla.resolvedAt ? `${Math.round(sla.resolutionTimeMin ?? 0)}min ${sla.resolutionBreached ? '🔴' : '🟢'}` : `target ${sla.resolutionTargetMin}min`}` : null,
        `📅 Created: ${ticket.createdAt.toLocaleString('id-ID')}`,
      ].filter(Boolean);

      return this.createResult(true, lines.join('\n'));
    } catch (error) {
      this.logger.error('Ticket status lookup failed', error as Error);
      return this.createErrorResult('Failed to get ticket status');
    }
  }
}

export class TicketListCommand extends BaseCommandHandler {
  constructor(logger: ILogger, private ticketService: TicketService) {
    super(logger);
  }

  getName(): string { return 'ticket-list'; }
  getDescription(): string { return 'List open tickets (!ticket-list [status])'; }
  getCategory(): string { return 'ticket'; }

  async execute(context: CommandContext): Promise<CommandResult> {
    const statusArg = context.input.replace(/^!ticket-list\s*/i, '').trim().toUpperCase();
    const filters: any = {};
    if (statusArg && ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'ESCALATED', 'CLOSED'].includes(statusArg)) {
      filters.status = statusArg;
    } else {
      filters.status = { in: ['OPEN', 'IN_PROGRESS', 'ESCALATED'] } as any;
    }

    try {
      const { tickets, total } = await this.ticketService.list(
        statusArg ? { status: statusArg as any } : {},
        15,
      );

      if (tickets.length === 0) return this.createResult(true, '📋 No tickets found.');

      const header = `📋 *Tickets* (${total} total)\n`;
      const lines = tickets.map((t) => {
        const slaIcon = t.slaTracking?.responseBreached || t.slaTracking?.resolutionBreached ? '🔴' : '🟢';
        return `${slaIcon} *${t.ticketNumber}* [${t.status}] ${t.priority}\n   ${t.title}`;
      });

      return this.createResult(true, header + lines.join('\n'));
    } catch (error) {
      this.logger.error('Ticket list failed', error as Error);
      return this.createErrorResult('Failed to list tickets');
    }
  }
}

export class TicketAssignCommand extends BaseCommandHandler {
  constructor(
    logger: ILogger,
    private ticketService: TicketService,
    private slaService: SLAService,
    private sheetsService?: GoogleSheetsService | null,
  ) {
    super(logger);
  }

  getName(): string { return 'ticket-assign'; }
  getDescription(): string { return 'Assign ticket (!ticket-assign <ticket-number> <user-id>)'; }
  getCategory(): string { return 'ticket'; }
  getRequiredRole(): string { return 'admin'; }

  async execute(context: CommandContext): Promise<CommandResult> {
    const args = context.input.replace(/^!ticket-assign\s+/i, '').trim().split(/\s+/);
    if (args.length < 2) {
      return this.createResult(false, '❌ Usage: !ticket-assign <ticket-number> <user-phone>');
    }

    try {
      const ticket = await this.ticketService.findByNumber(args[0].toUpperCase());
      if (!ticket) return this.createResult(false, `❌ Ticket ${args[0]} not found`);

      const updated = await this.ticketService.assign(ticket.id, args[1], context.user.id);
      // Stop response SLA timer when ticket is explicitly assigned
      await this.slaService.markResponded(ticket.id);
      if (updated && this.sheetsService?.isAvailable()) {
        this.sheetsService.syncTicket({
          id: updated.id,
          ticketNumber: updated.ticketNumber,
          customer: updated.customer ?? undefined,
          location: updated.location ?? undefined,
          ao: updated.ao ?? undefined,
          sid: updated.sid ?? undefined,
          service: updated.service ?? undefined,
          vlanId: updated.vlanId ?? undefined,
          vlanType: updated.vlanType ?? undefined,
          vlanName: updated.vlanName ?? undefined,
          hostnameSwitch: updated.hostnameSwitch ?? undefined,
          port: updated.port ?? undefined,
          ipAddress: updated.ipAddress ?? undefined,
          gateway: updated.gateway ?? undefined,
          subnet: updated.subnet ?? undefined,
          mode: updated.mode ?? undefined,
          problem: updated.problem,
          priority: updated.priority,
          category: updated.category,
          status: updated.status,
          assignedTo: updated.assignedTo?.displayName ?? updated.assignedTo?.phoneNumber ?? updated.assignedToId ?? undefined,
          createdBy: ticket.createdBy?.displayName ?? ticket.createdBy?.phoneNumber ?? 'Unknown',
          createdAt: updated.createdAt,
          resolvedAt: updated.resolvedAt,
        }).catch((err) => this.logger.error('GSheet syncTicket (assign) failed', err as Error));
      }
      return this.createResult(true, `✅ ${ticket.ticketNumber} assigned to ${args[1]}`);
    } catch (error) {
      this.logger.error('Ticket assign failed', error as Error);
      return this.createErrorResult('Failed to assign ticket');
    }
  }
}

export class TicketResolveCommand extends BaseCommandHandler {
  constructor(
    logger: ILogger,
    private ticketService: TicketService,
    private slaService: SLAService,
    private sheetsService?: GoogleSheetsService | null,
    private onResolved?: (params: TicketResolvedBroadcast) => Promise<void>,
  ) {
    super(logger);
  }

  getName(): string { return 'ticket-resolve'; }
  getDescription(): string { return 'Resolve ticket (!ticket-resolve <ticket-number> | <root-cause> | <solution>)'; }
  getCategory(): string { return 'ticket'; }
  getRequiredRole(): string { return 'user'; }

  async execute(context: CommandContext): Promise<CommandResult> {
    const args = context.input.replace(/^!ticket-resolve\s+/i, '').trim();
    const parts = args.split('|').map((s) => s.trim());
    if (parts.length < 3) {
      return this.createResult(false, '❌ Usage: !ticket-resolve <ticket-number> | <root-cause> | <solution>');
    }

    try {
      const ticket = await this.ticketService.findByNumber(parts[0].toUpperCase());
      if (!ticket) return this.createResult(false, `❌ Ticket ${parts[0]} not found`);

      const updated = await this.ticketService.resolve(ticket.id, parts[1], parts[2], context.user.id);
      await this.slaService.markResolved(ticket.id);
      if (updated && this.sheetsService?.isAvailable()) {
        this.sheetsService.syncTicket({
          id: updated.id,
          ticketNumber: updated.ticketNumber,
          customer: updated.customer ?? undefined,
          location: updated.location ?? undefined,
          ao: updated.ao ?? undefined,
          sid: updated.sid ?? undefined,
          service: updated.service ?? undefined,
          vlanId: updated.vlanId ?? undefined,
          vlanType: updated.vlanType ?? undefined,
          vlanName: updated.vlanName ?? undefined,
          hostnameSwitch: updated.hostnameSwitch ?? undefined,
          port: updated.port ?? undefined,
          ipAddress: updated.ipAddress ?? undefined,
          gateway: updated.gateway ?? undefined,
          subnet: updated.subnet ?? undefined,
          mode: updated.mode ?? undefined,
          problem: updated.problem,
          priority: updated.priority,
          category: updated.category,
          status: updated.status,
          assignedTo: updated.assignedTo?.displayName ?? updated.assignedTo?.phoneNumber ?? updated.assignedToId ?? undefined,
          createdBy: ticket.createdBy?.displayName ?? ticket.createdBy?.phoneNumber ?? 'Unknown',
          createdAt: updated.createdAt,
          resolvedAt: updated.resolvedAt,
        }).catch((err) => this.logger.error('GSheet syncTicket (resolve) failed', err as Error));
      }

      // Broadcast resolved event (e.g. to Telegram NOC group)
      if (this.onResolved) {
        this.onResolved({
          ticketNumber: ticket.ticketNumber,
          title: ticket.title,
          priority: ticket.priority,
          resolvedByName: context.user.displayName ?? context.user.phoneNumber ?? 'Unknown',
          rootCause: parts[1],
          solution: parts[2],
        }).catch(() => {});
      }

      return this.createResult(true, [
        `✅ *Ticket Resolved*`,
        `📋 ${ticket.ticketNumber}`,
        `🔍 Root Cause: ${parts[1]}`,
        `✨ Solution: ${parts[2]}`,
      ].join('\n'));
    } catch (error) {
      this.logger.error('Ticket resolve failed', error as Error);
      return this.createErrorResult('Failed to resolve ticket');
    }
  }
}

export class TicketCloseCommand extends BaseCommandHandler {
  constructor(
    logger: ILogger,
    private ticketService: TicketService,
    private sheetsService?: GoogleSheetsService | null,
  ) {
    super(logger);
  }

  getName(): string { return 'ticket-close'; }
  getDescription(): string { return 'Close a resolved ticket (!ticket-close <ticket-number>)'; }
  getCategory(): string { return 'ticket'; }
  getRequiredRole(): string { return 'user'; }

  async execute(context: CommandContext): Promise<CommandResult> {
    const num = context.input.replace(/^!ticket-close\s+/i, '').trim();
    if (!num) return this.createResult(false, '❌ Usage: !ticket-close <ticket-number>');

    try {
      const ticket = await this.ticketService.findByNumber(num.toUpperCase());
      if (!ticket) return this.createResult(false, `❌ Ticket ${num} not found`);

      const updated = await this.ticketService.close(ticket.id, context.user.id);
      if (updated && this.sheetsService?.isAvailable()) {
        this.sheetsService.syncTicket({
          id: updated.id,
          ticketNumber: updated.ticketNumber,
          customer: updated.customer ?? undefined,
          location: updated.location ?? undefined,
          ao: updated.ao ?? undefined,
          sid: updated.sid ?? undefined,
          service: updated.service ?? undefined,
          vlanId: updated.vlanId ?? undefined,
          vlanType: updated.vlanType ?? undefined,
          vlanName: updated.vlanName ?? undefined,
          hostnameSwitch: updated.hostnameSwitch ?? undefined,
          port: updated.port ?? undefined,
          ipAddress: updated.ipAddress ?? undefined,
          gateway: updated.gateway ?? undefined,
          subnet: updated.subnet ?? undefined,
          mode: updated.mode ?? undefined,
          problem: updated.problem,
          priority: updated.priority,
          category: updated.category,
          status: updated.status,
          assignedTo: updated.assignedTo?.displayName ?? updated.assignedTo?.phoneNumber ?? updated.assignedToId ?? undefined,
          createdBy: ticket.createdBy?.displayName ?? ticket.createdBy?.phoneNumber ?? 'Unknown',
          createdAt: updated.createdAt,
          resolvedAt: updated.resolvedAt,
        }).catch((err) => this.logger.error('GSheet syncTicket (close) failed', err as Error));
      }
      return this.createResult(true, `✅ ${ticket.ticketNumber} closed`);
    } catch (error) {
      this.logger.error('Ticket close failed', error as Error);
      return this.createErrorResult('Failed to close ticket');
    }
  }
}

export class TicketStatsCommand extends BaseCommandHandler {
  constructor(logger: ILogger, private ticketService: TicketService, private slaService: SLAService) {
    super(logger);
  }

  getName(): string { return 'ticket-stats'; }
  getDescription(): string { return 'Show ticket and SLA statistics'; }
  getCategory(): string { return 'ticket'; }

  async execute(_context: CommandContext): Promise<CommandResult> {
    try {
      const [stats, sla] = await Promise.all([
        this.ticketService.getStats(),
        this.slaService.getComplianceStats(),
      ]);

      const lines = [
        `📊 *Ticket & SLA Statistics*`,
        ``,
        `📋 *Tickets*`,
        `• Total: ${stats.total}`,
        `• Open: ${stats.open}`,
        `• In Progress: ${stats.inProgress}`,
        `• Resolved: ${stats.resolved}`,
        `• Critical: ${stats.critical} 🔴`,
        ``,
        `⏱️ *SLA Compliance*`,
        `• Response met: ${sla.responseMetPct}%`,
        `• Resolution met: ${sla.resolutionMetPct}%`,
        `• Avg response: ${sla.avgResponseMin} min`,
        `• Avg resolution: ${sla.avgResolutionMin} min`,
      ];

      return this.createResult(true, lines.join('\n'));
    } catch (error) {
      this.logger.error('Ticket stats failed', error as Error);
      return this.createErrorResult('Failed to get stats');
    }
  }
}

export class TicketPickCommand extends BaseCommandHandler {
  constructor(
    logger: ILogger,
    private ticketService: TicketService,
    private slaService: SLAService,
    private sheetsService?: GoogleSheetsService | null,
    private onPicked?: (params: TicketPickedBroadcast) => Promise<void>,
  ) {
    super(logger);
  }

  getName(): string { return 'take'; }
  getDescription(): string { return 'Self-assign a ticket and set it to IN_PROGRESS (!take <ticket-number>)'; }
  getCategory(): string { return 'ticket'; }
  // No getRequiredRole — any authenticated user can pick a ticket

  async execute(context: CommandContext): Promise<CommandResult> {
    const ticketNumber = context.input.replace(/^!take\s+/i, '').trim();
    if (!ticketNumber) {
      return this.createResult(false, [
        '❌ Usage: *!take <ticket-number>*',
        'Example: !take TKT-20260405-0001',
      ].join('\n'));
    }

    try {
      const ticket = await this.ticketService.findByNumber(ticketNumber.toUpperCase());
      if (!ticket) return this.createResult(false, `❌ Ticket *${ticketNumber}* tidak ditemukan`);

      // Already closed or resolved
      if (ticket.status === 'RESOLVED' || ticket.status === 'CLOSED') {
        return this.createResult(false, `⚠️ Ticket *${ticket.ticketNumber}* sudah ${ticket.status} — tidak bisa diambil`);
      }

      // Already assigned to someone else
      if (ticket.assignedToId && ticket.assignedToId !== context.user.id) {
        const who = ticket.assignedTo?.displayName ?? ticket.assignedTo?.phoneNumber ?? ticket.assignedToId;
        return this.createResult(false, [
          `⚠️ Ticket *${ticket.ticketNumber}* sudah diambil oleh *${who}*`,
          ``,
          `Untuk menimpa assignment: gunakan !ticket-assign ${ticket.ticketNumber} <user-phone> (admin only)`,
        ].join('\n'));
      }

      // Already assigned to self
      if (ticket.assignedToId === context.user.id && ticket.status === 'IN_PROGRESS') {
        const sla = ticket.slaTracking;
        const resMin = sla?.resolutionDeadline
          ? Math.round((sla.resolutionDeadline.getTime() - Date.now()) / 60000)
          : null;
        return this.createResult(true, [
          `ℹ️ Kamu sudah handling *${ticket.ticketNumber}*`,
          `📊 Status: IN_PROGRESS`,
          resMin !== null ? `⏱️ Resolution remaining: ${resMin > 0 ? `${resMin} menit` : `OVERDUE ${Math.abs(resMin)} menit`}` : null,
        ].filter(Boolean).join('\n'));
      }

      // Self-assign → status IN_PROGRESS
      const updated = await this.ticketService.assign(ticket.id, context.user.id, context.user.id);
      // Stop response SLA timer; capture result for breach info
      const respondedSla = await this.slaService.markResponded(ticket.id);

      const sla = updated?.slaTracking;
      const resolutionRemaining = sla?.resolutionDeadline
        ? Math.round((sla.resolutionDeadline.getTime() - Date.now()) / 60000)
        : null;
      const responseBreached = respondedSla?.responseBreached ?? false;
      const responseTimeMin = respondedSla?.responseTimeMin != null
        ? Math.round(respondedSla.responseTimeMin)
        : null;
      const resolutionTargetHr = sla?.resolutionTargetMin
        ? Math.round(sla.resolutionTargetMin / 60)
        : null;

      const me = context.user.displayName ?? context.user.phoneNumber ?? 'You';

      // Broadcast picked event (e.g. to Telegram NOC group)
      if (this.onPicked) {
        this.onPicked({
          ticketNumber: ticket.ticketNumber,
          title: ticket.title,
          priority: ticket.priority,
          handlerName: me,
          responseTimeMin: responseTimeMin ?? undefined,
          responseBreached,
          resolutionRemainingMin: resolutionRemaining ?? undefined,
        }).catch(() => {});
      }

      // Sync to GSheet — update Assigned To column
      if (updated && this.sheetsService?.isAvailable()) {
        this.sheetsService.syncTicket({
          id: updated.id,
          ticketNumber: updated.ticketNumber,
          customer: updated.customer ?? undefined,
          location: updated.location ?? undefined,
          ao: updated.ao ?? undefined,
          sid: updated.sid ?? undefined,
          service: updated.service ?? undefined,
          vlanId: updated.vlanId ?? undefined,
          vlanType: updated.vlanType ?? undefined,
          vlanName: updated.vlanName ?? undefined,
          hostnameSwitch: updated.hostnameSwitch ?? undefined,
          port: updated.port ?? undefined,
          ipAddress: updated.ipAddress ?? undefined,
          gateway: updated.gateway ?? undefined,
          subnet: updated.subnet ?? undefined,
          mode: updated.mode ?? undefined,
          problem: updated.problem,
          priority: updated.priority,
          category: updated.category,
          status: updated.status,
          assignedTo: updated.assignedTo?.displayName ?? updated.assignedTo?.phoneNumber ?? updated.assignedToId ?? undefined,
          createdBy: ticket.createdBy?.displayName ?? ticket.createdBy?.phoneNumber ?? 'Unknown',
          createdAt: updated.createdAt,
          resolvedAt: updated.resolvedAt,
        }).catch((err) => this.logger.error('GSheet syncTicket (take) failed', err as Error));
      }

      return this.createResult(true, [
        `✅ *Ticket Diambil!*`,
        ``,
        `📋 ${ticket.ticketNumber}`,
        `📝 ${ticket.title}`,
        ticket.customer ? `👤 Customer: ${ticket.customer}` : null,
        ticket.location ? `📍 Location: ${ticket.location}` : null,
        `🔴 Priority: ${ticket.priority}`,
        `📂 Category: ${ticket.category}`,
        `👷 Handler: *${me}*`,
        `📊 Status: IN_PROGRESS`,
        ``,
        sla?.slaLevel ? `🏷️ SLA Level: *${sla.slaLevel}*` : null,
        responseTimeMin !== null
          ? (responseBreached
              ? `⚠️ Response: *${responseTimeMin} menit* (BREACH — target ${sla?.responseTargetMin ?? '?'} min)`
              : `✅ Response: *${responseTimeMin} menit* (dalam target ${sla?.responseTargetMin ?? '?'} min)`)
          : null,
        resolutionRemaining !== null
          ? (resolutionRemaining > 0
              ? `⏱️ Sisa resolusi: *${resolutionRemaining >= 60 ? `${Math.floor(resolutionRemaining / 60)}j ${resolutionRemaining % 60}m` : `${resolutionRemaining} menit`}* (target ${resolutionTargetHr ?? '?'}h)`
              : `🚨 Resolution OVERDUE ${Math.abs(resolutionRemaining)} menit!`)
          : resolutionTargetHr !== null
              ? `⏱️ Target resolusi: *${resolutionTargetHr} jam*`
              : null,
        ``,
        `_Setelah selesai: !ticket-resolve ${ticket.ticketNumber} | <root-cause> | <solution>_`,
      ].filter(Boolean).join('\n'), { ticketNumber: ticket.ticketNumber });
    } catch (error) {
      this.logger.error('Ticket pick failed', error as Error);
      return this.createErrorResult('Failed to pick ticket');
    }
  }
}

export class MySLACommand extends BaseCommandHandler {
  constructor(logger: ILogger, private ticketService: TicketService) {
    super(logger);
  }

  getName(): string { return 'sla-me'; }
  getDescription(): string { return 'Show your personal SLA queue and urgency'; }
  getCategory(): string { return 'ticket'; }

  async execute(context: CommandContext): Promise<CommandResult> {
    try {
      const overview = await this.ticketService.getPersonalSLAOverview(context.user.id, 10);

      if (overview.totalActive === 0) {
        return this.createResult(true, '✅ *SLA Personal*\n\nTidak ada tiket aktif untuk kamu saat ini.');
      }

      const lines = [
        '⏱️ *SLA Personal*',
        '',
        `📋 Active tickets: ${overview.totalActive}`,
        `🚨 Breached: ${overview.breachedCount}`,
        `⚠️ Due ≤30m: ${overview.dueSoonCount}`,
        overview.noSlaCount > 0 ? `🧩 No SLA tracking: ${overview.noSlaCount}` : null,
        '',
        '*Top queue:*',
      ].filter(Boolean) as string[];

      for (const row of overview.rows.slice(0, 6)) {
        const icon = row.breached ? '🚨' : row.dueSoon ? '⚠️' : '✅';
        const responseText = row.responseRemainingMin === null
          ? 'resp:done'
          : row.responseRemainingMin < 0
            ? `resp:over ${Math.abs(row.responseRemainingMin)}m`
            : `resp:${row.responseRemainingMin}m`;
        const resolutionText = row.resolutionRemainingMin === null
          ? 'res:done'
          : row.resolutionRemainingMin < 0
            ? `res:over ${Math.abs(row.resolutionRemainingMin)}m`
            : `res:${row.resolutionRemainingMin}m`;

        lines.push(`${icon} *${row.ticketNumber}* [${row.status}] ${row.priority}`);
        lines.push(`   ${responseText} | ${resolutionText}`);
      }

      lines.push('');
      lines.push('Quick actions:');
      lines.push('• !ticket-list');
      lines.push('• !ticket-status <ticket-number>');
      lines.push('• !ticket-resolve <ticket-number> | <root-cause> | <solution>');

      return this.createResult(true, lines.join('\n'));
    } catch (error) {
      this.logger.error('sla-me failed', error as Error);
      return this.createErrorResult('Failed to get personal SLA overview');
    }
  }
}

export class TicketSyncCommand extends BaseCommandHandler {
  constructor(
    logger: ILogger,
    private ticketService: TicketService,
    private onTelegramNotify?: (ticket: any) => Promise<boolean>,
  ) {
    super(logger);
  }

  getName(): string { return 'sync-tickets'; }
  getDescription(): string { return 'Manually re-sync stuck tickets to GSheet and Telegram (!sync-tickets [limit])'; }
  getCategory(): string { return 'admin'; }
  getRequiredRole(): string { return 'admin'; }

  async execute(context: CommandContext): Promise<CommandResult> {
    const limitArg = context.input.replace(/^!sync-tickets\s*/i, '').trim();
    const limit = limitArg ? parseInt(limitArg, 10) : 50;

    try {
      const result = await this.ticketService.syncStuckTickets(this.onTelegramNotify, limit);
      
      const lines = [
        `✅ *Sync Recovery Completed*`,
        `📊 Checked: ${result.total} stickers`,
        `📄 Fixed GSheet: ${result.fixedGSheet}`,
        `💬 Fixed Telegram: ${result.fixedTelegram}`,
        ``,
        result.fixedGSheet === 0 && result.fixedTelegram === 0 
          ? `_All tickets were already up to date._` 
          : `_Data consistency has been restored._`
      ];

      return this.createResult(true, lines.join('\n'));
    } catch (error) {
      this.logger.error('Ticket sync command failed', error as Error);
      return this.createErrorResult('Failed to run ticket sync recovery');
    }
  }
}
export class TicketReportTemplateCommand extends BaseCommandHandler {
  getName(): string { return 'template-report'; }
  getDescription(): string { return 'Show neuCentrIX ticket report templates (alias: !template-gangguan)'; }
  getCategory(): string { return 'ticket'; }

  async execute(_context: CommandContext): Promise<CommandResult> {
    const template = `═══════════════════════════════════════════════════════
📋 *TEMPLATE LAPORAN TIKET GANGGUAN - neuCentrIX*
═══════════════════════════════════════════════════════

📌 *CARA PENGGUNAAN:*
1. Copy template di bawah ini
2. Isi data sesuai kondisi gangguan
3. Kirim ke bot WhatsApp (langsung atau via grup)
4. Bot akan otomatis proses dan kirim notifikasi

🔴 *TEMPLATE LENGKAP - UNTUK GANGGUAN CRITICAL*
───────────────────────────────────────────────────────
Customer: [Nama Customer]
Location: [neuCentrIX Location]
Problem: [Deskripsi masalah detail]
Contact: [Nomor telepon/WhatsApp]
Priority: Critical
Category: Incident

AO: [Nomor AO]
SID: [Service ID]
Layanan: [Jenis layanan, e.g. Internet/Colocation]

Hostname Switch: [Nama hostname]
Port: [Nomor port]
Vlan ID: [Nomor VLAN]

IP Address: [IP customer]
Gateway: [IP Gateway]
Subnet Mask: [Subnet mask]

Note: [Catatan tambahan]
───────────────────────────────────────────────────────

🟡 *TEMPLATE BASIC - UNTUK LAPORAN STANDAR*
───────────────────────────────────────────────────────
Customer: PT Maju Jaya
Location: neuCentrIX Meruya
Problem: Degradasi speed internet sejak pagi
Contact: 0812-xxxx-xxxx
Priority: High
───────────────────────────────────────────────────────

💡 _Tips: Gunakan Priority *Critical* untuk respon 15 menit & resolusi 2 jam._`;

    return this.createResult(true, template);
  }
}
