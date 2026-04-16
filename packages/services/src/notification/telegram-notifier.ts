import { ILogger } from '@pjtaudirabot/core';
import type { NewTicketBroadcast } from '../command/ticket-commands';

/**
 * Sends notifications to a Telegram group on behalf of the WhatsApp bot.
 * Calls the Telegram Bot API directly via HTTP — no Telegram bot process required.
 *
 * Required env vars:
 *   TELEGRAM_BOT_TOKEN   — existing bot token
 *   TELEGRAM_NOC_CHAT_ID — ID of the NOC Telegram group (e.g. -1001234567890)
 *
 * How to get TELEGRAM_NOC_CHAT_ID:
 *   1. Add the bot to the group as admin
 *   2. Send any message in the group
 *   3. Open: https://api.telegram.org/bot<TOKEN>/getUpdates
 *   4. Copy the "chat.id" value from the update (negative number for groups)
 */
export class TelegramNotifier {
  private logger: ILogger;
  private readonly apiBase: string;

  constructor(
    private botToken: string,
    private chatId: string,
    logger: ILogger,
  ) {
    this.logger = logger.child({ service: 'tg-notifier' });
    this.apiBase = `https://api.telegram.org/bot${this.botToken}`;
  }

  isConfigured(): boolean {
    return this.botToken.length > 0 && this.chatId.length > 0;
  }

  /** Send a raw HTML-formatted message to the NOC group */
  async sendMessage(html: string): Promise<void> {
    if (!this.isConfigured()) return;

    const url = `${this.apiBase}/sendMessage`;
    const body = JSON.stringify({
      chat_id: this.chatId,
      text: html,
      parse_mode: 'HTML',
    });

    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });

    if (!resp.ok) {
      const errText = await resp.text();
      throw new Error(`Telegram API ${resp.status}: ${errText}`);
    }
  }

  /** Parse technical details string and extract lokasi + alokasi for display */
  private parseTechnicalDetails(details?: string): Record<string, string> {
    const result: Record<string, string> = {};
    if (!details) return result;

    const lines = details.split('\n');
    for (const line of lines) {
      const match = line.match(/^\s*(?:•\s*)?([^:]+):\s*(.+)$/);
      if (match) {
        const [, key, value] = match;
        result[key.trim().toLowerCase()] = value.trim();
      }
    }
    return result;
  }

  private combineAlokasi(technical: Record<string, string>): string | undefined {
    if (technical.alokasi) return technical.alokasi;

    const hostname = technical.hostnameswitch ?? technical.hostname ?? technical.switch;
    const port = technical.port;
    if (hostname && port) return `${hostname} / ${port}`;
    if (hostname) return hostname;
    if (port) return port;
    return undefined;
  }

  /** Notify NOC Telegram group when a new ticket is created (from any source) */
  async sendNewTicket(params: NewTicketBroadcast): Promise<void> {
    if (!this.isConfigured()) return;

    const priorityEmoji: Record<string, string> = {
      CRITICAL: '🚨', HIGH: '🔴', MEDIUM: '🟡', LOW: '🟢',
    };
    const icon = priorityEmoji[params.priority] ?? '📋';
    const technical = this.parseTechnicalDetails(params.technicalDetails?.trim());
    const lokasi = technical.location ?? technical.lokasi;
    const customer = technical.customer ?? technical.cust;
    const alokasi = params.alokasi ?? this.combineAlokasi(technical);
    const vlan = technical.vlanid ?? technical.vlan;
    const mode = technical.mode;
    const problem = params.problem?.trim() || technical.problem;
    const problemText = problem
      ? (problem.length > 180 ? `${problem.slice(0, 180)}…` : problem)
      : undefined;

    const text = [
      `${icon} <b>TIKET BARU — ${this.esc(params.priority)}</b>`,
      `━━━━━━━━━━━━━━━━━━━━`,
      `🎫 <b>ID:</b> <code>${this.esc(params.ticketNumber)}</code>`,
      `📝 <b>Problem:</b> ${this.esc(params.title)}`,
      `📂 <b>Category:</b> ${this.esc(params.category)}`,
      `👤 <b>Dari:</b> <b>${this.esc(params.createdByName)}</b>`,
      params.groupId ? `💬 <b>Group:</b> <code>${this.esc(params.groupId)}</code>` : null,
      ``,
      `<b>👤 INFORMASI PELANGGAN</b>`,
      `────────────────────`,
      customer ? `🏢 <b>Nama:</b> ${this.esc(customer)}` : `🏢 <b>Customer:</b> Unknown`,
      params.customerServices?.length 
        ? `🛠️ <b>Layanan Terdaftar:</b>\n${params.customerServices.map(s => `  • ${this.esc(s).replace(/ — \[(.*?)\]/, ' — [<b>$1</b>]')}`).join('\n')}` 
        : `🛠️ <b>Layanan:</b> <i>Tidak ada aset terdaftar</i>`,
      ``,
      `<b>📍 DETAIL TEKNIS</b>`,
      `────────────────────`,
      lokasi ? `📍 <b>Lokasi:</b> ${this.esc(lokasi)}` : null,
      alokasi ? `🔧 <b>Alokasi:</b> ${this.esc(alokasi)}` : null,
      vlan ? `🌐 <b>VLAN ID:</b> <code>${this.esc(vlan)}</code>` : null,
      mode ? `🧭 <b>Mode:</b> ${this.esc(mode)}` : null,
      problemText ? `📝 <b>Catatan:</b> ${this.esc(problemText)}` : null,
      ``,
      `━━━━━━━━━━━━━━━━━━━━`,
      `👉 <b>AMBIL TIKET:</b>`,
      `  Telegram: <code>!take ${this.esc(params.ticketNumber)}</code>`,
      `  WhatsApp: <code>!take ${this.esc(params.ticketNumber)}</code>`,
    ].filter(Boolean).join('\n');

    try {
      await this.sendMessage(text);
      this.logger.info('Telegram NOC ticket notification sent', { ticketNumber: params.ticketNumber });
    } catch (err) {
      this.logger.error('Failed to send Telegram ticket notification', err as Error);
    }
  }

  /** Notify when a ticket is picked up by an engineer */
  async sendTicketPicked(params: {
    ticketNumber: string;
    title: string;
    priority: string;
    handlerName: string;
    responseTimeMin?: number | null;
    responseBreached?: boolean;
    resolutionRemainingMin?: number | null;
  }): Promise<void> {
    if (!this.isConfigured()) return;

    const priorityEmoji: Record<string, string> = {
      CRITICAL: '🚨', HIGH: '🔴', MEDIUM: '🟡', LOW: '🟢',
    };
    const icon = priorityEmoji[params.priority] ?? '📋';
    const now = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' });

    let resInfo: string | null = null;
    if (params.resolutionRemainingMin != null) {
      const rem = params.resolutionRemainingMin;
      if (rem > 0) {
        const h = Math.floor(rem / 60);
        const m = rem % 60;
        resInfo = `⏱️ Sisa resolusi: <b>${h > 0 ? `${h}j ` : ''}${m}m</b>`;
      } else {
        resInfo = `🚨 Resolusi OVERDUE <b>${Math.abs(rem)} menit</b>!`;
      }
    }

    const responseInfo = params.responseTimeMin != null
      ? (params.responseBreached
          ? `⚠️ Response: ${params.responseTimeMin}m (BREACH)`
          : `✅ Response: ${params.responseTimeMin}m (on-time)`)
      : null;

    const text = [
      `${icon} <b>TIKET DIAMBIL — ${this.esc(params.priority)}</b>`,
      ``,
      `📋 <code>${this.esc(params.ticketNumber)}</code>`,
      `📝 ${this.esc(params.title)}`,
      `👷 Handler: <b>${this.esc(params.handlerName)}</b>`,
      `📊 Status: <b>IN_PROGRESS</b>`,
      `🕐 Pickup: ${now}`,
      responseInfo,
      resInfo,
      ``,
      `────────────────`,
      `⚠️ <i>Tiket ini sudah diambil. Jangan ambil lagi!</i>`,
      `Selesaikan: <code>!ticket-resolve ${this.esc(params.ticketNumber)} | &lt;cause&gt; | &lt;solution&gt;</code>`,
    ].filter(Boolean).join('\n');

    try {
      await this.sendMessage(text);
    } catch (err) {
      this.logger.error('Failed to send Telegram pick notification', err as Error);
    }
  }

  /** Notify when a ticket is resolved */
  async sendTicketResolved(params: {
    ticketNumber: string;
    title: string;
    priority: string;
    resolvedByName: string;
    rootCause: string;
    solution: string;
  }): Promise<void> {
    if (!this.isConfigured()) return;

    const text = [
      `✅ <b>TIKET RESOLVED</b>`,
      ``,
      `📋 <code>${this.esc(params.ticketNumber)}</code>`,
      `📝 ${this.esc(params.title)}`,
      `👷 Resolved by: <b>${this.esc(params.resolvedByName)}</b>`,
      ``,
      `🔍 <b>Root Cause:</b>`,
      this.esc(params.rootCause),
      ``,
      `✨ <b>Solution:</b>`,
      this.esc(params.solution),
    ].join('\n');

    try {
      await this.sendMessage(text);
    } catch (err) {
      this.logger.error('Failed to send Telegram resolve notification', err as Error);
    }
  }

  /** Forward SLA warnings and breaches to Telegram NOC group */
  async sendSLAAlert(warnings: string[], breaches: string[]): Promise<void> {
    if (!this.isConfigured()) return;
    if (warnings.length === 0 && breaches.length === 0) return;

    const parts: string[] = [];

    if (breaches.length > 0) {
      parts.push(`🚨 <b>SLA BREACHED (${breaches.length})</b>`);
      parts.push('');
      for (const b of breaches.slice(0, 8)) {
        // Extract ticket number for CTA formatting
        const tktMatch = b.match(/([A-Z]+-\d{8}-\d{4})/);
        const tkt = tktMatch ? `<code>${this.esc(tktMatch[1])}</code>` : '';
        parts.push(`• ${this.esc(b)}${tkt ? '' : ''}`);
      }
      if (breaches.length > 8) parts.push(`  <i>...dan ${breaches.length - 8} lainnya</i>`);
      parts.push('');
    }

    if (warnings.length > 0) {
      parts.push(`⚠️ <b>SLA Warning (${warnings.length})</b>`);
      parts.push('');
      for (const w of warnings.slice(0, 5)) {
        parts.push(`• ${this.esc(w)}`);
      }
      if (warnings.length > 5) parts.push(`  <i>...dan ${warnings.length - 5} lainnya</i>`);
    }

    try {
      await this.sendMessage(parts.join('\n'));
    } catch (err) {
      this.logger.error('Failed to send Telegram SLA alert', err as Error);
    }
  }

  /** Send Preventive Maintenance updates to Telegram NOC group */
  async sendMaintenanceAlert(messages: string[]): Promise<void> {
    if (!this.isConfigured() || messages.length === 0) return;

    // Send each PM message individually to avoid truncation
    for (const msg of messages) {
      // Convert WA-style *bold* to HTML <b>bold</b> for Telegram
      const htmlMsg = this.esc(msg)
        .replace(/\*(.*?)\*/g, '<b>$1</b>')
        .replace(/_(.*?)_/g, '<i>$1</i>')
        .replace(/━/g, '─');

      try {
        await this.sendMessage(htmlMsg);
      } catch (err) {
        this.logger.error('Failed to send Telegram maintenance alert', err as Error);
      }
    }

    this.logger.info('Telegram maintenance alerts sent', { count: messages.length });
  }

  /** Send a scheduled report (daily/weekly/monthly) to the NOC group.
   *  Reports use Markdown (*bold*, _italic_) so we use Markdown parse mode here. */
  async sendReportText(text: string): Promise<void> {
    if (!this.isConfigured()) return;

    const url = `${this.apiBase}/sendMessage`;
    const body = JSON.stringify({
      chat_id: this.chatId,
      text,
      parse_mode: 'Markdown',
    });

    try {
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      });
      if (!resp.ok) {
        // Fallback: retry without parse_mode if Markdown fails
        const bodyPlain = JSON.stringify({ chat_id: this.chatId, text });
        await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: bodyPlain });
      }
      this.logger.info('Telegram report sent');
    } catch (err) {
      this.logger.error('Failed to send Telegram report', err as Error);
    }
  }

  /** Notify when ticket clustering detected (multiple related incidents from same incident) */
  async sendClusterDetected(params: {
    clusterNumber: string;
    clusterUrl?: string;
    masterTicket: { number: string; title: string; priority: string; category: string };
    memberCount: number;  // excluding master
    impactScore: number;
    commonLocation?: string;
    commonCustomer?: string;
    commonService?: string;
    affectedAssets?: Array<{ hostname?: string; port?: string; location?: string }>;
  }): Promise<void> {
    if (!this.isConfigured()) return;

    const icon = params.impactScore >= 75 ? '🚨' : params.impactScore >= 50 ? '🔴' : '🟠';
    const link = params.clusterUrl ? `<a href="${params.clusterUrl}">View Details</a>` : '';

    const text = [
      `${icon} <b>CLUSTER DETECTED — ${params.masterTicket.priority}</b>`,
      ``,
      `📦 <code>${this.esc(params.clusterNumber)}</code>`,
      `🔗 linked tickets: <b>${params.memberCount + 1}</b>`,
      ``,
      `📋 Master Ticket`,
      `  <code>${this.esc(params.masterTicket.number)}</code> ${this.esc(params.masterTicket.title)}`,
      `  Category: ${this.esc(params.masterTicket.category)}`,
      ``,
      `📊 Impact Score: <b>${params.impactScore.toFixed(0)}/100</b>`,
      params.commonLocation ? `📍 Location: ${this.esc(params.commonLocation)}` : null,
      params.commonCustomer ? `👥 Customer: ${this.esc(params.commonCustomer)}` : null,
      params.commonService ? `🔧 Service: ${this.esc(params.commonService)}` : null,
      params.affectedAssets && params.affectedAssets.length > 0
        ? `🖥️ Affected Assets:\n${params.affectedAssets.slice(0, 3).map((a) => `  • ${a.hostname || a.port || 'unknown'}${a.location ? ` @ ${a.location}` : ''}`).join('\n')}${params.affectedAssets.length > 3 ? `\n  ...and ${params.affectedAssets.length - 3} more` : ''}`
        : null,
      ``,
      `────────────────`,
      `⚠️ <i>Multiple related tickets detected from same incident</i>`,
      `🎯 Action: Check all linked tickets together for faster resolution`,
      link ? ` • ${link}` : null,
    ].filter(Boolean).join('\n');

    try {
      await this.sendMessage(text);
      this.logger.info('Telegram cluster detection notification sent', { clusterNumber: params.clusterNumber, memberCount: params.memberCount });
    } catch (err) {
      this.logger.error('Failed to send Telegram cluster notification', err as Error);
    }
  }

  private esc(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
}
