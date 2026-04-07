import { CommandContext, CommandResult, ILogger } from '@pjtaudirabot/core';
import { BaseCommandHandler } from './handler';
import { NetworkService } from '../network';

export class NetworkStatusCommand extends BaseCommandHandler {
  constructor(logger: ILogger, private networkService: NetworkService) {
    super(logger);
  }

  getName(): string { return 'network'; }
  getDescription(): string { return 'Show network branch health status'; }
  getCategory(): string { return 'network'; }

  async execute(_context: CommandContext): Promise<CommandResult> {
    try {
      const branches = await this.networkService.getAllBranches();
      if (branches.length === 0) return this.createResult(true, '🌐 No branches configured.');

      const lines = branches.map((b) => {
        const icon = b.healthScore >= 90 ? '🟢' : b.healthScore >= 70 ? '🟡' : b.healthScore >= 50 ? '🟠' : '🔴';
        return `${icon} *${b.name}* (${b.branchId})\n   Health: ${b.healthScore}/100 | Status: ${b.healthStatus}${b.uptimePercent != null ? ` | Uptime: ${b.uptimePercent}%` : ''}`;
      });

      return this.createResult(true, `🌐 *Network Status*\n\n` + lines.join('\n\n'));
    } catch (error) {
      this.logger.error('Network status failed', error as Error);
      return this.createErrorResult('Failed to get network status');
    }
  }
}

export class NetworkAuditCommand extends BaseCommandHandler {
  constructor(logger: ILogger, private networkService: NetworkService) {
    super(logger);
  }

  getName(): string { return 'audit'; }
  getDescription(): string { return 'Run comprehensive network audit'; }
  getCategory(): string { return 'network'; }
  getRequiredRole(): string { return 'admin'; }

  async execute(_context: CommandContext): Promise<CommandResult> {
    try {
      const result = await this.networkService.performAudit();

      const catLines = Object.entries(result.categories)
        .map(([name, cat]) => `  • ${name}: ${cat.score}/100 ${cat.issues.length > 0 ? '⚠️' : '✅'}`)
        .join('\n');

      const issueLines = result.criticalIssues.length > 0
        ? result.criticalIssues.join('\n')
        : '  None';

      const actionLines = result.actionItems.length > 0
        ? result.actionItems.join('\n')
        : '  None needed';

      return this.createResult(true, [
        `📋 *NETWORK AUDIT REPORT*`,
        `🏆 Overall Score: *${result.overallScore}/100*`,
        ``,
        `📊 *Categories*`,
        catLines,
        ``,
        `🚨 *Critical Issues*`,
        issueLines,
        ``,
        `📝 *Action Items*`,
        actionLines,
      ].join('\n'));
    } catch (error) {
      this.logger.error('Audit failed', error as Error);
      return this.createErrorResult('Failed to run audit');
    }
  }
}
