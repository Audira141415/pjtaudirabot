import { CommandContext, CommandResult, ILogger } from '@pjtaudirabot/core';
import { BaseCommandHandler } from './handler';
import { CRMService } from '../crm';

export class CustomerAddCommand extends BaseCommandHandler {
  constructor(logger: ILogger, private crmService: CRMService) {
    super(logger);
  }

  getName(): string { return 'customer-add'; }
  getDescription(): string { return 'Add a new customer to CRM'; }
  getCategory(): string { return 'CRM'; }

  async execute(context: CommandContext): Promise<CommandResult> {
    const input = context.input.trim();
    if (!input) {
      return this.createResult(false, 'Usage: !customer-add <name> <phone> [--email=...] [--company=...]');
    }

    const words = input.split(' ');
    const name = words[0];
    const phone = words[1];
    
    if (!name || !phone) {
      return this.createResult(false, 'Customer name and phone are required.');
    }

    const extra: any = {};
    words.forEach(word => {
      if (word.startsWith('--')) {
        const [key, value] = word.substring(2).split('=');
        if (key === 'email') extra.email = value;
        if (key === 'company') extra.company = value;
        if (key === 'position') extra.position = value;
      }
    });

    try {
      const contact = await this.crmService.addContact({ name, phone, ...extra });
      return this.createResult(true, `Customer ${contact.name} added successfully with ID: ${contact.id}`);
    } catch (e: any) {
      return this.createErrorResult(`Failed to add customer: ${e.message}`);
    }
  }
}

export class CustomerListCommand extends BaseCommandHandler {
  constructor(logger: ILogger, private crmService: CRMService) {
    super(logger);
  }

  getName(): string { return 'customer-list'; }
  getDescription(): string { return 'List customers in CRM'; }
  getCategory(): string { return 'CRM'; }

  async execute(context: CommandContext): Promise<CommandResult> {
    const query = context.input.trim();
    const { contacts, total } = await this.crmService.listContacts(query);

    if (total === 0) {
      return this.createResult(true, 'No customers found.');
    }

    let message = `👥 **Customer List** (${total} total):\n\n`;
    contacts.forEach(c => {
      message += `- **${c.name}** (${c.phone})${c.company ? ` - ${c.company}` : ''}\n`;
    });

    return this.createResult(true, message);
  }
}

export class CustomerInfoCommand extends BaseCommandHandler {
  constructor(logger: ILogger, private crmService: CRMService) {
    super(logger);
  }

  getName(): string { return 'customer-info'; }
  getDescription(): string { return 'Get detailed information for a customer'; }
  getCategory(): string { return 'CRM'; }

  async execute(context: CommandContext): Promise<CommandResult> {
    const idOrPhone = context.input.trim();
    if (!idOrPhone) {
      return this.createResult(false, 'Usage: !customer-info <id|phone>');
    }

    const contact = await this.crmService.getContact(idOrPhone);
    if (!contact) {
      return this.createResult(false, 'Customer not found.');
    }

    let message = `👤 **Customer Info: ${contact.name}**\n`;
    message += `📱 Phone: ${contact.phone || 'N/A'}\n`;
    message += `📧 Email: ${contact.email || 'N/A'}\n`;
    message += `🏢 Company: ${contact.company || 'N/A'}\n`;
    message += `💼 Position: ${contact.position || 'N/A'}\n`;
    message += `📝 Notes: ${contact.notes || 'None'}\n`;
    message += `📅 Created: ${contact.createdAt.toLocaleDateString()}\n`;
    message += `📈 Total Interactions: ${contact.totalInteractions}\n`;

    if (contact.interactions.length > 0) {
      message += `\n🕒 **Recent Interactions:**\n`;
      contact.interactions.forEach(i => {
        message += `- [${i.createdAt.toLocaleDateString()}] ${i.type}: ${i.content}\n`;
      });
    }

    return this.createResult(true, message);
  }
}

export class CustomerTicketsCommand extends BaseCommandHandler {
  constructor(logger: ILogger, private crmService: CRMService) {
    super(logger);
  }

  getName(): string { return 'customer-tickets'; }
  getDescription(): string { return 'List tickets associated with a customer'; }
  getCategory(): string { return 'CRM'; }

  async execute(context: CommandContext): Promise<CommandResult> {
    const nameOrPhone = context.input.trim();
    if (!nameOrPhone) {
      return this.createResult(false, 'Usage: !customer-tickets <name|phone>');
    }

    const tickets = await this.crmService.getContactTickets(nameOrPhone);
    if (tickets.length === 0) {
      return this.createResult(true, 'No tickets found for this customer.');
    }

    let message = `📋 **Tickets for Customer:** ${nameOrPhone}\n\n`;
    tickets.forEach(t => {
      message += `- [${t.ticketNumber}] ${t.title} (${t.status})\n`;
    });

    return this.createResult(true, message);
  }
}

export class CustomerUpdateCommand extends BaseCommandHandler {
  constructor(logger: ILogger, private crmService: CRMService) {
    super(logger);
  }

  getName(): string { return 'customer-update'; }
  getDescription(): string { return 'Update customer details'; }
  getCategory(): string { return 'CRM'; }

  async execute(context: CommandContext): Promise<CommandResult> {
    const input = context.input.trim();
    const words = input.split(' ');
    const id = words[0];
    if (!id || words.length < 2) {
      return this.createResult(false, 'Usage: !customer-update <id> --field=value...');
    }

    const data: any = {};
    words.slice(1).forEach(word => {
      if (word.startsWith('--')) {
        const [key, value] = word.substring(2).split('=');
        if (['name', 'phone', 'email', 'company', 'position', 'notes'].includes(key)) {
          data[key] = value;
        }
      }
    });

    try {
      const updated = await this.crmService.updateContact(id, data);
      return this.createResult(true, `Customer ${updated.name} updated successfully.`);
    } catch (e: any) {
      return this.createErrorResult(`Failed to update customer: ${e.message}`);
    }
  }
}

export class CustomerDeleteCommand extends BaseCommandHandler {
  constructor(logger: ILogger, private crmService: CRMService) {
    super(logger);
  }

  getName(): string { return 'customer-delete'; }
  getDescription(): string { return 'Delete a customer from CRM'; }
  getCategory(): string { return 'CRM'; }
  getRequiredRole(): string { return 'admin'; }

  async execute(context: CommandContext): Promise<CommandResult> {
    const id = context.input.trim();
    if (!id) {
      return this.createResult(false, 'Usage: !customer-delete <id>');
    }

    try {
      await this.crmService.deleteContact(id);
      return this.createResult(true, `Customer with ID ${id} deleted successfully.`);
    } catch (e: any) {
      return this.createErrorResult(`Failed to delete customer: ${e.message}`);
    }
  }
}
