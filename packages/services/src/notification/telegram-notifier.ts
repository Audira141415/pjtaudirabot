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
  private parseAndFormatTechnicalDetails(details?: string): { lokasi?: string; alokasi?: string; other: string[] } {
    const result: { lokasi?: string; alokasi?: string; other: string[] } = { other: [] };
    if (!details) return result;

    const lines = details.split('\n');
    for (const line of lines) {
      const match = line.match(/•\s+([^:]+):\s*(.+)/);
      if (match) {
        const [, key, value] = match;
        if (key.toLowerCase() === 'location' || key.toLowerCase() === 'lokasi') {
          result.lokasi = value.trim();
        } else if (key.toLowerCase() === 'alokasi') {
          result.alokasi = value.trim();
        } else {
          result.other.push(line);
        }
      } else {
        result.other.push(line);
      }
    }
    return result;
  }

  /** Notify NOC Telegram group when a new ticket is created (from any source) */
  async sendNewTicket(params: NewTicketBroadcast): Promise<void> {
    if (!this.isConfigured()) return;

    const priorityEmoji: Record<string, string> = {
      CRITICAL: '🚨', HIGH: '🔴', MEDIUM: '🟡', LOW: '🟢',
    };
    const icon = priorityEmoji[params.priority] ?? '📋';
    const problem = params.problem.length > 300
      ? `${params.problem.slice(0, 300)}…`
      : params.problem;
    
    const parsed = this.parseAndFormatTechnicalDetails(params.technicalDetails?.trim());

    const text = [
      `${icon} <b>TIKET BARU — ${this.esc(params.priority)}</b>`,
      ``,
      `📋 <code>${this.esc(params.ticketNumber)}</code>`,
      `📝 ${this.esc(params.title)}`,
      `📂 ${this.esc(params.category)}`,
      `👤 Dari: <b>${this.esc(params.createdByName)}</b>`,
      params.groupId ? `💬 Group: <code>${this.esc(params.groupId)}</code>` : null,
      ``,
      `<i>Problem:</i>`,
      this.esc(problem),
      parsed.lokasi ? `` : null,
      parsed.lokasi ? `📍 <b>Lokasi:</b> ${this.esc(parsed.lokasi)}` : null,
      parsed.alokasi ? `🔧 <b>Alokasi:</b> ${this.esc(parsed.alokasi)}` : null,
      parsed.other.length > 0 ? '' : null,
      parsed.other.length > 0 ? '<i>Detail Teknis Lainnya:</i>' : null,
      parsed.other.length > 0 ? this.esc(parsed.other.join('\n')) : null,
      ``,
      `────────────────`,
      `👉 Ambil tiket:`,
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

  private esc(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
}
