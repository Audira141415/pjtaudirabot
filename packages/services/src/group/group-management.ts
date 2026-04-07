import { PrismaClient } from '@prisma/client';
import { ILogger } from '@pjtaudirabot/core';

export interface ChatGroupInput {
  groupJid: string;
  groupName: string;
  description?: string;
  isMonitored?: boolean;
  isReportTarget?: boolean;
  reportTypes?: string[];
}

export interface ReportGroupConfigInput {
  chatGroupId: string;
  enableDaily?: boolean;
  enableWeekly?: boolean;
  enableMonthly?: boolean;
  dailyHour?: number;
  weeklyDay?: number;
  weeklyHour?: number;
  monthlyDay?: number;
  monthlyHour?: number;
  timezone?: string;
  includeCharts?: boolean;
  includeSummary?: boolean;
}

export class GroupManagementService {
  constructor(private prisma: PrismaClient, private logger: ILogger) {}

  /**
   * Add atau update ChatGroup
   */
  async upsertChatGroup(input: ChatGroupInput) {
    const {
      groupJid,
      groupName,
      description,
      isMonitored,
      isReportTarget,
      reportTypes
    } = input;

    try {
      const group = await this.prisma.chatGroup.upsert({
        where: { groupJid },
        create: {
          groupJid,
          groupName,
          description,
          isMonitored: isMonitored ?? false,
          isReportTarget: isReportTarget ?? false,
          reportTypes: reportTypes ?? [],
        },
        update: {
          groupName,
          description: description ?? undefined,
          isMonitored: isMonitored ?? undefined,
          isReportTarget: isReportTarget ?? undefined,
          reportTypes: reportTypes ?? undefined,
        },
        include: { reportConfig: true },
      });

      // Jika isReportTarget=true dan belum ada config, buat default config
      if (isReportTarget && !group.reportConfig) {
        await this.createReportGroupConfig({
          chatGroupId: group.id,
        });
      }

      this.logger.info(`ChatGroup upserted: ${groupName} (${groupJid})`);
      return group;
    } catch (error) {
      this.logger.error(`Failed to upsert ChatGroup: ${error}`);
      throw error;
    }
  }

  /**
   * Get semua monitored groups
   */
  async getMonitoredGroups() {
    try {
      return await this.prisma.chatGroup.findMany({
        where: { isMonitored: true },
        include: { reportConfig: true },
      });
    } catch (error) {
      this.logger.error(`Failed to get monitored groups: ${error}`);
      throw error;
    }
  }

  /**
   * Get semua report target groups
   */
  async getReportTargetGroups(reportType?: string) {
    try {
      const groups = await this.prisma.chatGroup.findMany({
        where: { isReportTarget: true },
        include: { reportConfig: true },
      });

      if (!reportType) return groups;

      // Filter berdasarkan report type
      return groups.filter((g) => {
        const config = g.reportConfig;
        if (!config) return false;

        switch (reportType.toUpperCase()) {
          case 'DAILY':
            return config.enableDaily;
          case 'WEEKLY':
            return config.enableWeekly;
          case 'MONTHLY':
            return config.enableMonthly;
          default:
            return false;
        }
      });
    } catch (error) {
      this.logger.error(`Failed to get report target groups: ${error}`);
      throw error;
    }
  }

  /**
   * Get semua groups dengan config lengkap
   */
  async getAllGroups() {
    try {
      return await this.prisma.chatGroup.findMany({
        include: { reportConfig: true },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      this.logger.error(`Failed to get all groups: ${error}`);
      throw error;
    }
  }

  /**
   * Get single group
   */
  async getChatGroup(groupJid: string) {
    try {
      return await this.prisma.chatGroup.findUnique({
        where: { groupJid },
        include: { reportConfig: true },
      });
    } catch (error) {
      this.logger.error(`Failed to get ChatGroup: ${error}`);
      throw error;
    }
  }

  /**
   * Remove ChatGroup
   */
  async removeChatGroup(groupJid: string) {
    try {
      const group = await this.prisma.chatGroup.delete({
        where: { groupJid },
      });
      this.logger.info(`ChatGroup removed: ${groupJid}`);
      return group;
    } catch (error) {
      if ((error as any).code === 'P2025') {
        this.logger.warn(`ChatGroup not found: ${groupJid}`);
        return null;
      }
      this.logger.error(`Failed to remove ChatGroup: ${error}`);
      throw error;
    }
  }

  /**
   * Update group monitoring status
   */
  async setGroupMonitoring(groupJid: string, isMonitored: boolean) {
    try {
      const group = await this.prisma.chatGroup.update({
        where: { groupJid },
        data: { isMonitored },
        include: { reportConfig: true },
      });
      this.logger.info(`Group monitoring updated: ${groupJid} = ${isMonitored}`);
      return group;
    } catch (error) {
      if ((error as any).code === 'P2025') {
        this.logger.warn(`ChatGroup not found: ${groupJid}`);
        return null;
      }
      throw error;
    }
  }

  /**
   * Create ReportGroupConfig
   */
  async createReportGroupConfig(input: ReportGroupConfigInput) {
    try {
      return await this.prisma.reportGroupConfig.create({
        data: {
          chatGroupId: input.chatGroupId,
          enableDaily: input.enableDaily ?? false,
          enableWeekly: input.enableWeekly ?? false,
          enableMonthly: input.enableMonthly ?? false,
          dailyHour: input.dailyHour,
          weeklyDay: input.weeklyDay,
          weeklyHour: input.weeklyHour,
          monthlyDay: input.monthlyDay,
          monthlyHour: input.monthlyHour,
          timezone: input.timezone,
          includeCharts: input.includeCharts ?? true,
          includeSummary: input.includeSummary ?? true,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to create ReportGroupConfig: ${error}`);
      throw error;
    }
  }

  /**
   * Update ReportGroupConfig
   */
  async updateReportGroupConfig(chatGroupId: string, input: Partial<ReportGroupConfigInput>) {
    try {
      // Pastikan config ada
      let config = await this.prisma.reportGroupConfig.findUnique({
        where: { chatGroupId },
      });

      if (!config) {
        config = await this.createReportGroupConfig({ chatGroupId });
      }

      // Update config
      return await this.prisma.reportGroupConfig.update({
        where: { chatGroupId },
        data: {
          enableDaily: input.enableDaily !== undefined ? input.enableDaily : undefined,
          enableWeekly: input.enableWeekly !== undefined ? input.enableWeekly : undefined,
          enableMonthly: input.enableMonthly !== undefined ? input.enableMonthly : undefined,
          dailyHour: input.dailyHour !== undefined ? input.dailyHour : undefined,
          weeklyDay: input.weeklyDay !== undefined ? input.weeklyDay : undefined,
          weeklyHour: input.weeklyHour !== undefined ? input.weeklyHour : undefined,
          monthlyDay: input.monthlyDay !== undefined ? input.monthlyDay : undefined,
          monthlyHour: input.monthlyHour !== undefined ? input.monthlyHour : undefined,
          timezone: input.timezone !== undefined ? input.timezone : undefined,
          includeCharts: input.includeCharts !== undefined ? input.includeCharts : undefined,
          includeSummary: input.includeSummary !== undefined ? input.includeSummary : undefined,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to update ReportGroupConfig: ${error}`);
      throw error;
    }
  }

  /**
   * Set report type untuk group
   */
  async setGroupReportType(chatGroupId: string, reportType: string, enable: boolean) {
    try {
      let config = await this.prisma.reportGroupConfig.findUnique({
        where: { chatGroupId },
      });

      if (!config) {
        config = await this.createReportGroupConfig({ chatGroupId });
      }

      const updateData: any = {};
      const reportTypeUpper = reportType.toUpperCase();

      if (reportTypeUpper === 'DAILY') {
        updateData.enableDaily = enable;
      } else if (reportTypeUpper === 'WEEKLY') {
        updateData.enableWeekly = enable;
      } else if (reportTypeUpper === 'MONTHLY') {
        updateData.enableMonthly = enable;
      } else {
        throw new Error(`Invalid report type: ${reportType}`);
      }

      return await this.prisma.reportGroupConfig.update({
        where: { chatGroupId },
        data: updateData,
      });
    } catch (error) {
      this.logger.error(`Failed to set group report type: ${error}`);
      throw error;
    }
  }

  /**
   * Format groups untuk display
   */
  formatGroupsList(groups: any[]): string {
    if (groups.length === 0) {
      return '📭 *Tidak ada grup yang terdaftar*';
    }

    const lines = ['*Daftar Grup dan Konfigurasi:*\n'];

    groups.forEach((group, idx) => {
      const config = group.reportConfig;
      const reports: string[] = [];

      if (config?.enableDaily) reports.push('📅 Daily');
      if (config?.enableWeekly) reports.push('📆 Weekly');
      if (config?.enableMonthly) reports.push('📊 Monthly');

      const reportStr = reports.length > 0 ? reports.join(', ') : 'Tidak ada';
      const monitored = group.isMonitored ? '✅' : '⛔';
      const target = group.isReportTarget ? '📤' : '❌';

      lines.push(
        `${idx + 1}. *${group.groupName}*`,
        `   JID: \`${group.groupJid}\``,
        `   Monitor: ${monitored} | Target: ${target}`,
        `   Reports: ${reportStr}`,
        ''
      );
    });

    return lines.join('\n');
  }
}
