import { CommandContext, CommandResult, ILogger } from '@pjtaudirabot/core';
import { BaseCommandHandler } from './handler';
import { CRMService } from '../crm';

export class AssetAddCommand extends BaseCommandHandler {
  constructor(logger: ILogger, private crmService: CRMService) {
    super(logger);
  }

  getName(): string { return 'asset-add'; }
  getDescription(): string { return 'Add an asset (VLAN/Service) to a customer'; }
  getCategory(): string { return 'CRM'; }

  async execute(context: CommandContext): Promise<CommandResult> {
    const input = context.input.trim();
    const match = input.match(/^!asset-add\s+(?:"([^"]+)"|([^\s]+))\s+([^\s]+)\s+([^\s]+)(?:\s+(.+))?$/i);
    
    if (!match) {
      return this.createResult(false, '❌ Usage: !asset-add <"name"|phone|id> <vlan_id> <service_type> [notes]\nExample: !asset-add "John Doe" 100 IPTX');
    }

    const query = match[1] || match[2];
    const identifier = match[3];
    const serviceType = match[4].toUpperCase();
    const description = match[5];

    try {
      const contact = await this.crmService.getContact(query);
      if (!contact) {
        return this.createResult(false, `❌ Customer '${query}' not found.`);
      }

      await this.crmService.addAsset(contact.id, {
        identifier,
        serviceType,
        description,
        type: 'VLAN',
      });

      return this.createResult(true, `✅ Asset added to **${contact.name}**: VLAN ${identifier} (${serviceType})\n📊 GSheet: *Synced*`);
    } catch (e: any) {
      return this.createErrorResult(`Failed to add asset: ${e.message}`);
    }
  }
}

export class AssetSyncAllCommand extends BaseCommandHandler {
  constructor(logger: ILogger, private crmService: CRMService) {
    super(logger);
  }

  getName(): string { return 'asset-sync-all'; }
  getDescription(): string { return 'Sync all assets from database to Google Sheets'; }
  getCategory(): string { return 'CRM'; }
  getRequiredRole(): string { return 'admin'; }

  async execute(_context: CommandContext): Promise<CommandResult> {
    try {
      const result = await this.crmService.syncAllAssets();
      if (result.error) return this.createResult(false, `❌ Sync failed: ${result.error}`);
      
      return this.createResult(true, [
        `🔄 **Asset Sync Completed**`,
        `━━━━━━━━━━━━━━━━━━━━`,
        `📊 Total Assets: ${result.total}`,
        `✅ Successfully Synced: ${result.synced}`,
        result.total === result.synced ? `✨ All records are up to date.` : `⚠️ Some records failed to sync. Check logs.`
      ].join('\n'));
    } catch (e: any) {
      return this.createErrorResult(`Sync error: ${e.message}`);
    }
  }
}

export class CustomerAssetsCommand extends BaseCommandHandler {
  constructor(logger: ILogger, private crmService: CRMService) {
    super(logger);
  }

  getName(): string { return 'customer-assets'; }
  getDescription(): string { return 'View customer assets (VLANs & Services)'; }
  getCategory(): string { return 'CRM'; }

  async execute(context: CommandContext): Promise<CommandResult> {
    const query = context.input.replace(/^!customer-assets\s+/i, '').trim();
    if (!query) {
      return this.createResult(false, '❌ Usage: !customer-assets <name|phone>');
    }

    try {
      const contact = await this.crmService.findContactWithAssets(query);
      if (!contact) {
        return this.createResult(false, `❌ Customer '${query}' not found.`);
      }

      const assets = contact.assets || [];
      if (assets.length === 0) {
        return this.createResult(true, `👤 **Customer:** ${contact.name}\n\n❌ No assets registered for this customer.`);
      }

      let message = `👤 **Customer Assets: ${contact.name}**\n`;
      message += assets.length > 0 ? `📊 Services: ${Array.from(new Set(assets.map(a => a.serviceType))).filter(Boolean).join(', ')}\n` : '';
      message += `━━━━━━━━━━━━━━━━━━━━\n\n`;

      assets.forEach(asset => {
        message += `🌐 **VLAN ${asset.identifier}**\n`;
        message += `   Layanan: \`${asset.serviceType || 'Unknown'}\`\n`;
        if (asset.description) message += `   Notes: ${asset.description}\n`;
        message += `\n`;
      });

      return this.createResult(true, message);
    } catch (e: any) {
      return this.createErrorResult(`Failed to fetch report: ${e.message}`);
    }
  }
}
