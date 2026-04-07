import { CommandContext, CommandResult, ILogger } from '@pjtaudirabot/core';
import { BaseCommandHandler } from './handler';
import { ShiftHandoverService } from '../shift-handover';

// ── !handover ──

export class HandoverCommand extends BaseCommandHandler {
  constructor(logger: ILogger, private handoverService: ShiftHandoverService) {
    super(logger);
  }

  getName(): string { return 'handover'; }
  getDescription(): string { return 'Generate shift handover report: !handover [PAGI|SIANG|MALAM]'; }
  getCategory(): string { return 'operations'; }

  async execute(context: CommandContext): Promise<CommandResult> {
    try {
      const forceShift = (context.input ?? '').trim().toUpperCase() || undefined;
      const validShifts = ['PAGI', 'SIANG', 'MALAM'];
      if (forceShift && !validShifts.includes(forceShift)) {
        return this.createResult(false, '❌ Shift harus: PAGI, SIANG, atau MALAM');
      }

      const handover = await this.handoverService.generateHandover(forceShift);
      return this.createResult(true, handover.formattedText);
    } catch (error) {
      this.logger.error('handover command failed', error as Error);
      return this.createErrorResult('Gagal generate handover report');
    }
  }
}

// ── !handover-ack ──

export class HandoverAckCommand extends BaseCommandHandler {
  constructor(logger: ILogger, private handoverService: ShiftHandoverService) {
    super(logger);
  }

  getName(): string { return 'handover-ack'; }
  getDescription(): string { return 'Acknowledge shift handover'; }
  getCategory(): string { return 'operations'; }

  async execute(context: CommandContext): Promise<CommandResult> {
    try {
      const record = await this.handoverService.acknowledgeHandover(context.user.id);
      if (!record) {
        return this.createResult(false, '❌ Tidak ada handover report yang perlu di-acknowledge saat ini');
      }

      const shift = this.handoverService.getCurrentShift();
      return this.createResult(true, [
        `✅ *Handover Acknowledged*`,
        ``,
        `Shift ${shift.description} telah diterima.`,
        `Terima kasih sudah konfirmasi!`,
        ``,
        `_Gunakan !ticket-list untuk melihat tiket yang belum selesai_`,
      ].join('\n'));
    } catch (error) {
      this.logger.error('handover-ack failed', error as Error);
      return this.createErrorResult('Gagal acknowledge handover');
    }
  }
}

// ── !shift ──

export class ShiftInfoCommand extends BaseCommandHandler {
  constructor(logger: ILogger, private handoverService: ShiftHandoverService) {
    super(logger);
  }

  getName(): string { return 'shift'; }
  getDescription(): string { return 'Show current shift info'; }
  getCategory(): string { return 'operations'; }

  async execute(_context: CommandContext): Promise<CommandResult> {
    const current = this.handoverService.getCurrentShift();
    const next = this.handoverService.getNextShift();
    const isHandoverTime = this.handoverService.isHandoverTime();

    const lines = [
      `🔄 *SHIFT INFO*`,
      ``,
      `📍 Shift saat ini: *${current.description}*`,
      `➡️ Shift berikutnya: *${next.description}*`,
      isHandoverTime ? `⏰ *HANDOVER WINDOW AKTIF* — ketik !handover untuk generate report` : '',
      ``,
      `_Jadwal:_`,
      `  PAGI  : 07:00 - 15:00`,
      `  SIANG : 15:00 - 23:00`,
      `  MALAM : 23:00 - 07:00`,
    ].filter(Boolean);

    return this.createResult(true, lines.join('\n'));
  }
}
