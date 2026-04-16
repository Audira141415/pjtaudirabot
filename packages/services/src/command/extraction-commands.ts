import { CommandContext, CommandResult, ILogger } from '@pjtaudirabot/core';
import { BaseCommandHandler } from './handler';
import { DataExtractionService } from '../data-extraction';
import { TicketService } from '../ticket';
import { SLAService } from '../sla';

export class ExtractCommand extends BaseCommandHandler {
  constructor(
    logger: ILogger,
    private extractionService: DataExtractionService,
    private ticketService: TicketService,
    private slaService: SLAService,
  ) {
    super(logger);
  }

  getName(): string { return 'extract'; }
  getDescription(): string { return 'Extract NOC data and auto-create ticket (!extract <message>)'; }
  getCategory(): string { return 'data'; }

  async execute(context: CommandContext): Promise<CommandResult> {
    const message = context.input.replace(/^!extract\s+/i, '').trim();
    if (!message) {
      return this.createResult(false, '❌ Usage: !extract <paste NOC message here>');
    }

    try {
      const result = this.extractionService.extract(message);
      if (!result.isValid) {
        return this.createResult(false, '❌ Could not extract data. Ensure message contains standard fields (Lokasi, Customer, Problem, etc.)');
      }

      // Check duplicate
      const dup = await this.extractionService.checkDuplicate(result.data);
      if (dup.isDuplicate) {
        return this.createResult(false, `⚠️ Duplicate detected (${Math.round(dup.similarity * 100)}% similarity). Use !extract-force to create anyway.`);
      }

      // Auto-create ticket
      const priority = result.priorityScore >= 8 ? 'CRITICAL' : result.priorityScore >= 6 ? 'HIGH' : result.priorityScore >= 4 ? 'MEDIUM' : 'LOW';
      const ticket = await this.ticketService.create({
        createdById: context.user.id,
        title: result.data.problem ?? `${result.data.customer ?? 'Unknown'} - ${result.category}`,
        description: message,
        problem: result.data.problem ?? message,
        priority: priority as any,
        category: result.category,
        customer: result.data.customer,
        location: result.data.location,
        ao: result.data.ao,
        sid: result.data.sid,
        service: result.data.service,
        vlanId: result.data.vlanId,
        hostnameSwitch: result.data.hostnameSwitch,
        port: result.data.port,
        ipAddress: result.data.ipAddress,
        gateway: result.data.gateway,
        subnet: result.data.subnet,
        mode: result.data.mode,
        source: context.platform === 'whatsapp' ? 'WHATSAPP' : 'TELEGRAM',
        groupId: context.groupId,
        sourceMessage: message,
      });

      await this.slaService.startTracking(ticket.id, ticket.priority, ticket.category, result.data.problem);

      // Save extraction
      await this.extractionService.save(result.data, message, {
        ticketId: ticket.id,
        extractedById: context.user.id,
        platform: context.platform,
        groupId: context.groupId,
        category: result.category,
        priorityScore: result.priorityScore,
      });

      const extracted = Object.entries(result.data)
        .filter(([, v]) => v)
        .map(([k, v]) => `  • ${k}: ${v}`)
        .join('\n');

      return this.createResult(true, [
        `⚡ *AUDI NOC SYSTEMS — EXTRACTION COMPLETE*`,
        `━━━━━━━━━━━━━━━━━━━━`,
        `🎫 *ID:* [${ticket.ticketNumber}]`,
        `👤 *SENDER:* [${context.user.displayName ?? 'System'}]`,
        `━━━━━━━━━━━━━━━━━━━━`,
        `📊 *VITAL STATS*`,
        `• Priority: 🎯 ${priority} (score: ${result.priorityScore}/10)`,
        `• Category: 📁 ${result.category}`,
        `• Extracted: ${result.fieldCount} fields`,
        `• Status: 🔋 ACTIVE TRACKING`,
        ``,
        `📝 *RAW DATA SUMMARY*`,
        extracted,
        ``,
        `⏱️ *SLA MONITORING:* [STARTED]`,
        `_Gunakan !ticket-status ${ticket.ticketNumber} untuk pembaruan real-time._`,
      ].join('\n'), { ticketNumber: ticket.ticketNumber, data: result.data });
    } catch (error) {
      this.logger.error('Extraction failed', error as Error);
      return this.createErrorResult('Failed to extract data');
    }
  }
}
