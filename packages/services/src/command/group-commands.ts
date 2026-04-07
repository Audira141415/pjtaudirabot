import { CommandContext, CommandResult, ILogger } from '@pjtaudirabot/core';
import { GroupManagementService } from '../group/group-management';
import { BaseCommandHandler } from './handler';

export class ListGroupsCommand extends BaseCommandHandler {
  constructor(
    logger: ILogger,
    private groupService: GroupManagementService
  ) {
    super(logger);
  }

  getName(): string {
    return 'list-groups';
  }

  getDescription(): string {
    return 'Tampilkan semua grup yang terdaftar dan konfigurasinya';
  }

  getCategory(): string {
    return 'admin';
  }

  getRequiredRole(): string {
    return 'admin';
  }

  async execute(_context: CommandContext): Promise<CommandResult> {
    try {
      const groups = await this.groupService.getAllGroups();
      const message = this.groupService.formatGroupsList(groups);
      return this.createResult(true, message);
    } catch (error) {
      this.logger.error(`Error in ListGroupsCommand: ${error}`);
      return this.createErrorResult((error as any).message);
    }
  }
}

export class AddGroupCommand extends BaseCommandHandler {
  constructor(
    logger: ILogger,
    private groupService: GroupManagementService
  ) {
    super(logger);
  }

  getName(): string {
    return 'add-group';
  }

  getDescription(): string {
    return 'Tambahkan grup baru untuk monitoring dan/atau report';
  }

  getCategory(): string {
    return 'admin';
  }

  getRequiredRole(): string {
    return 'admin';
  }

  async execute(context: CommandContext): Promise<CommandResult> {
    const parts = context.input.trim().split(/\s+/);
    
    if (parts.length < 2) {
      return this.createErrorResult('Format: !add-group <jid> <name>\nContoh: !add-group 120363xxx@g.us "Admin Group"');
    }

    const groupJid = parts[0];
    const groupName = parts.slice(1).join(' ');

    // Basic validation
    if (!groupJid.includes('@g.us')) {
      return this.createErrorResult('JID tidak valid. Format: 120363xxx@g.us');
    }

    try {
      const group = await this.groupService.upsertChatGroup({
        groupJid,
        groupName,
        isMonitored: false,
        isReportTarget: false,
      });

      const message = `✅ Grup ditambahkan: *${group.groupName}*\n\`${group.groupJid}\`\n\nKonfigurasi monitoring dan report dengan:\n!set-monitor-group <jid> true\n!set-report-target <type> <jid> true`;
      return this.createResult(true, message);
    } catch (error) {
      this.logger.error(`Error in AddGroupCommand: ${error}`);
      return this.createErrorResult((error as any).message);
    }
  }
}

export class SetMonitorGroupCommand extends BaseCommandHandler {
  constructor(
    logger: ILogger,
    private groupService: GroupManagementService
  ) {
    super(logger);
  }

  getName(): string {
    return 'set-monitor-group';
  }

  getDescription(): string {
    return 'Aktifkan/nonaktifkan monitoring untuk grup';
  }

  getCategory(): string {
    return 'admin';
  }

  getRequiredRole(): string {
    return 'admin';
  }

  async execute(context: CommandContext): Promise<CommandResult> {
    const parts = context.input.trim().split(/\s+/);
    
    if (parts.length < 2) {
      return this.createErrorResult('Format: !set-monitor-group <jid> <true|false>\nContoh: !set-monitor-group 120363xxx@g.us true');
    }

    const groupJid = parts[0];
    const shouldMonitor = parts[1].toLowerCase().trim() === 'true';

    try {
      const group = await this.groupService.setGroupMonitoring(groupJid, shouldMonitor);

      if (!group) {
        return this.createErrorResult(`Grup tidak ditemukan: ${groupJid}`);
      }

      const status = shouldMonitor ? '✅ DIAKTIFKAN' : '❌ DINONAKTIFKAN';
      const message = `${status}\n\nGrup *${group.groupName}* monitoring ${shouldMonitor ? 'diaktifkan' : 'dinonaktifkan'}`;
      return this.createResult(true, message);
    } catch (error) {
      this.logger.error(`Error in SetMonitorGroupCommand: ${error}`);
      return this.createErrorResult((error as any).message);
    }
  }
}

export class SetReportTargetCommand extends BaseCommandHandler {
  constructor(
    logger: ILogger,
    private groupService: GroupManagementService
  ) {
    super(logger);
  }

  getName(): string {
    return 'set-report-target';
  }

  getDescription(): string {
    return 'Atur laporan mana saja yang dikirim ke grup';
  }

  getCategory(): string {
    return 'admin';
  }

  getRequiredRole(): string {
    return 'admin';
  }

  async execute(context: CommandContext): Promise<CommandResult> {
    const parts = context.input.trim().split(/\s+/);
    
    if (parts.length < 3) {
      return this.createErrorResult('Format: !set-report-target <daily|weekly|monthly> <jid> <true|false>\n\nContoh:\n!set-report-target daily 120363xxx@g.us true\n!set-report-target weekly 120363xxx@g.us false');
    }

    const reportType = parts[0];
    const groupJid = parts[1];
    const enable = parts[2].toLowerCase().trim() === 'true';

    // Validate report type
    if (!['daily', 'weekly', 'monthly'].includes(reportType.toLowerCase())) {
      return this.createErrorResult('Tipe laporan tidak valid. Pilih: daily, weekly, atau monthly');
    }

    try {
      // Pastikan group ada
      let group = await this.groupService.getChatGroup(groupJid);
      if (!group) {
        return this.createErrorResult(`Grup tidak ditemukan: ${groupJid}`);
      }

      // Update report config
      const config = await this.groupService.setGroupReportType(group.id, reportType, enable);

      // Update group isReportTarget flag jika diperlukan
      const hasAnyReport = config.enableDaily || config.enableWeekly || config.enableMonthly;
      if (hasAnyReport !== group.isReportTarget) {
        group = await this.groupService.upsertChatGroup({
          groupJid,
          groupName: group.groupName,
          isReportTarget: hasAnyReport,
        });
      }

      const status = enable ? '✅ DIAKTIFKAN' : '❌ DINONAKTIFKAN';
      const message = `${status}\n\nLaporan *${reportType.toUpperCase()}* untuk grup *${group.groupName}* ${enable ? 'diaktifkan' : 'dinonaktifkan'}`;
      return this.createResult(true, message);
    } catch (error) {
      this.logger.error(`Error in SetReportTargetCommand: ${error}`);
      return this.createErrorResult((error as any).message);
    }
  }
}

export class RemoveGroupCommand extends BaseCommandHandler {
  constructor(
    logger: ILogger,
    private groupService: GroupManagementService
  ) {
    super(logger);
  }

  getName(): string {
    return 'remove-group';
  }

  getDescription(): string {
    return 'Hapus grup dari daftar';
  }

  getCategory(): string {
    return 'admin';
  }

  getRequiredRole(): string {
    return 'admin';
  }

  async execute(context: CommandContext): Promise<CommandResult> {
    const parts = context.input.trim().split(/\s+/);
    
    if (parts.length < 1) {
      return this.createErrorResult('Format: !remove-group <jid>\nContoh: !remove-group 120363xxx@g.us');
    }

    const groupJid = parts[0];

    try {
      const group = await this.groupService.removeChatGroup(groupJid);

      if (!group) {
        return this.createErrorResult(`Grup tidak ditemukan: ${groupJid}`);
      }

      const message = `✅ Grup *${group.groupName}* telah dihapus`;
      return this.createResult(true, message);
    } catch (error) {
      this.logger.error(`Error in RemoveGroupCommand: ${error}`);
      return this.createErrorResult((error as any).message);
    }
  }
}

export class ReportConfigCommand extends BaseCommandHandler {
  constructor(
    logger: ILogger,
    private groupService: GroupManagementService
  ) {
    super(logger);
  }

  getName(): string {
    return 'report-config';
  }

  getDescription(): string {
    return 'Tampilkan konfigurasi laporan saat ini';
  }

  getCategory(): string {
    return 'admin';
  }

  getRequiredRole(): string {
    return 'admin';
  }

  async execute(_context: CommandContext): Promise<CommandResult> {
    try {
      const groups = await this.groupService.getReportTargetGroups();

      if (groups.length === 0) {
        const message = '*📊 Konfigurasi Laporan*\n\n❌ Belum ada grup yang dikonfigurasi untuk menerima laporan.\n\nGunakan:\n!add-group <jid> <name> - Tambah grup\n!set-report-target <type> <jid> true - Aktifkan laporan';
        return this.createResult(true, message);
      }

      let output = '*📊 Konfigurasi Laporan Aktif*\n\n';

      for (const group of groups) {
        const config = group.reportConfig;
        output += `*${group.groupName}*\n`;
        output += `JID: \`${group.groupJid}\`\n`;

        if (config?.enableDaily) {
          output += `  📅 Daily @ ${config.dailyHour ?? 7}:00\n`;
        }
        if (config?.enableWeekly) {
          const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
          const day = days[config.weeklyDay ?? 1];
          output += `  📆 Weekly @ ${day} ${config.weeklyHour ?? 8}:00\n`;
        }
        if (config?.enableMonthly) {
          const day = config.monthlyDay ?? 'Last';
          output += `  📊 Monthly @ Day ${day} ${config.monthlyHour ?? 18}:00\n`;
        }

        output += '\n';
      }

      return this.createResult(true, output);
    } catch (error) {
      this.logger.error(`Error in ReportConfigCommand: ${error}`);
      return this.createErrorResult((error as any).message);
    }
  }
}

