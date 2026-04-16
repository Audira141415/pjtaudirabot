import { PrismaClient, InteractionType } from '@prisma/client';
import { ILogger } from '@pjtaudirabot/core';
import { SheetsService } from '../sheets';

export interface CreateContactInput {
  name: string;
  phone?: string;
  email?: string;
  company?: string;
  position?: string;
  notes?: string;
  tags?: string[];
}

export class CRMService {
  private logger: ILogger;

  constructor(private db: PrismaClient, logger: ILogger, private sheetsService: SheetsService | null = null) {
    this.logger = logger.child({ service: 'crm' });
  }

  async addContact(input: CreateContactInput) {
    this.logger.info('Adding new contact', { name: input.name });
    return this.db.cRMContact.create({
      data: {
        name: input.name,
        phone: input.phone,
        email: input.email,
        company: input.company,
        position: input.position,
        notes: input.notes,
        tags: input.tags ?? [],
      },
    });
  }

  async listContacts(query?: string, limit = 20, offset = 0) {
    const where: any = {};
    if (query) {
      where.OR = [
        { name: { contains: query, mode: 'insensitive' } },
        { company: { contains: query, mode: 'insensitive' } },
        { phone: { contains: query } },
      ];
    }

    const [contacts, total] = await Promise.all([
      this.db.cRMContact.findMany({
        where,
        orderBy: { name: 'asc' },
        take: limit,
        skip: offset,
      }),
      this.db.cRMContact.count({ where }),
    ]);

    return { contacts, total };
  }

  async getContact(idOrPhone: string) {
    return this.db.cRMContact.findFirst({
      where: {
        OR: [
          { id: idOrPhone },
          { phone: idOrPhone },
        ],
      },
      include: {
        interactions: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });
  }

  async updateContact(id: string, data: Partial<CreateContactInput>) {
    return this.db.cRMContact.update({
      where: { id },
      data: {
        ...data,
        tags: data.tags ? data.tags : undefined,
      },
    });
  }

  async deleteContact(id: string) {
    return this.db.cRMContact.delete({
      where: { id },
    });
  }

  async getContactTickets(nameOrPhone: string) {
    return this.db.ticket.findMany({
      where: {
        customer: { contains: nameOrPhone, mode: 'insensitive' },
      },
      orderBy: { createdAt: 'desc' },
      include: { slaTracking: true },
    });
  }

  async logInteraction(contactId: string, type: InteractionType, content: string, channel?: string, subject?: string) {
    const interaction = await this.db.cRMInteraction.create({
      data: {
        contactId,
        type,
        content,
        channel,
        subject,
      },
    });

    await this.db.cRMContact.update({
      where: { id: contactId },
      data: {
        lastInteractionAt: new Date(),
        totalInteractions: { increment: 1 },
      },
    });

    return interaction;
  }

  async addAsset(contactId: string, data: { identifier: string; serviceType?: string; description?: string; type?: string }) {
    this.logger.info('Adding asset to contact', { contactId, identifier: data.identifier });
    const asset = await this.db.cRMAsset.create({
      data: {
        contactId,
        identifier: data.identifier,
        serviceType: data.serviceType,
        description: data.description,
        type: data.type || 'VLAN',
      },
    });

    // Sync to Google Sheets
    if (this.sheetsService?.isAvailable()) {
      const contact = await this.db.cRMContact.findUnique({ where: { id: contactId } });
      this.sheetsService.appendToSheet('crm_assets', {
        'ID': asset.id,
        'Contact ID': contactId,
        'Customer Name': contact?.name || 'Unknown',
        'Type': asset.type,
        'Identifier': asset.identifier,
        'Service Type': asset.serviceType || '-',
        'Description': asset.description || '-',
        'Created At': asset.createdAt.toISOString(),
      }).catch(err => this.logger.error('Failed to sync asset to GSheet', err as Error));
    }

    return asset;
  }

  async listAssets(contactId: string) {
    return this.db.cRMAsset.findMany({
      where: { contactId },
      orderBy: { identifier: 'asc' },
    });
  }

  async syncAllAssets() {
    if (!this.sheetsService?.isAvailable()) return { total: 0, synced: 0, error: 'Sheets service not available' };
    
    const assets = await this.db.cRMAsset.findMany({
      include: { contact: true },
    });

    const rows = assets.map(asset => ({
      'ID': asset.id,
      'Contact ID': asset.contactId,
      'Customer Name': asset.contact.name,
      'Type': asset.type,
      'Identifier': asset.identifier,
      'Service Type': asset.serviceType || '-',
      'Description': asset.description || '-',
      'Created At': asset.createdAt.toISOString(),
    }));

    // SheetsService.appendRows is more efficient for many rows
    // Since appendToSheet is used for daily ops, we'll use a loop or batch if supported
    let synced = 0;
    for (const row of rows) {
      try {
        await this.sheetsService.appendToSheet('crm_assets', row);
        synced++;
      } catch (e) {
        this.logger.error('Failed to sync asset row during sync-all', e as Error);
      }
    }

    return { total: assets.length, synced };
  }

  async findContactWithAssets(query: string) {
    return this.db.cRMContact.findFirst({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { phone: { contains: query } },
        ],
      },
      include: {
        assets: true,
      },
    });
  }
}
