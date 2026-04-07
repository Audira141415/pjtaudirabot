export type Locale = 'en' | 'id';

export interface I18nMessages {
  // General
  error_generic: string;
  error_rate_limit: string;
  error_unauthorized: string;
  error_not_found: string;

  // Commands
  cmd_help_title: string;
  cmd_help_no_commands: string;
  cmd_ping_response: string;
  cmd_status_title: string;
  cmd_echo_empty: string;
  cmd_unknown: string;

  // AI
  ai_unavailable: string;
  ai_empty_input: string;
  ai_history_cleared: string;
  ai_thinking: string;

  // Memory
  memory_cleared: string;
  memory_fact_saved: string;

  // Moderation
  mod_warning: string;
  mod_blocked: string;
  mod_muted: string;

  // Broadcast
  broadcast_received: string;

  // Flow
  flow_expired: string;
  flow_cancelled: string;
  flow_completed: string;
  flow_invalid_input: string;

  // Summary
  summary_title: string;
  summary_empty: string;

  // Welcome
  welcome_message: string;
  welcome_back: string;
}

const en: I18nMessages = {
  error_generic: '❌ An error occurred. Please try again.',
  error_rate_limit: '⏳ Rate limit exceeded. Please try again in {time}s.',
  error_unauthorized: '🔒 You are not authorized to use this command.',
  error_not_found: '🔍 {resource} not found.',

  cmd_help_title: '📋 **Available Commands**',
  cmd_help_no_commands: 'No commands available.',
  cmd_ping_response: '🏓 Pong! Latency: {latency}ms',
  cmd_status_title: '📊 **Bot Status**',
  cmd_echo_empty: 'Usage: !echo <message>',
  cmd_unknown: '❓ Unknown command "{command}". Type !help for available commands.',

  ai_unavailable: '🤖 AI service is currently unavailable. Please try again later.',
  ai_empty_input: 'Usage: !ai <message>\nExample: !ai What is TypeScript?',
  ai_history_cleared: '🧹 AI conversation history cleared.',
  ai_thinking: '🤔 Thinking...',

  memory_cleared: '🧹 All memory cleared.',
  memory_fact_saved: '💾 Got it! I\'ll remember that.',

  mod_warning: '⚠️ Your message was flagged. Please be respectful.',
  mod_blocked: '🚫 Your message was blocked by moderation.',
  mod_muted: '🔇 You have been temporarily muted.',

  broadcast_received: '📢 **Announcement**\n{content}',

  flow_expired: '⏰ This conversation flow has expired. Please start again.',
  flow_cancelled: '❌ Flow cancelled.',
  flow_completed: '✅ All done! Thank you.',
  flow_invalid_input: '⚠️ Invalid input. {hint}',

  summary_title: '📝 **Conversation Summary**',
  summary_empty: 'No conversation history to summarize.',

  welcome_message: '👋 Welcome, {name}! I\'m your AI assistant. Type !help to get started.',
  welcome_back: '👋 Welcome back, {name}!',
};

const id: I18nMessages = {
  error_generic: '❌ Terjadi kesalahan. Silakan coba lagi.',
  error_rate_limit: '⏳ Batas permintaan terlampaui. Coba lagi dalam {time} detik.',
  error_unauthorized: '🔒 Anda tidak memiliki izin untuk perintah ini.',
  error_not_found: '🔍 {resource} tidak ditemukan.',

  cmd_help_title: '📋 **Daftar Perintah**',
  cmd_help_no_commands: 'Tidak ada perintah tersedia.',
  cmd_ping_response: '🏓 Pong! Latensi: {latency}ms',
  cmd_status_title: '📊 **Status Bot**',
  cmd_echo_empty: 'Penggunaan: !echo <pesan>',
  cmd_unknown: '❓ Perintah "{command}" tidak dikenal. Ketik !help untuk daftar perintah.',

  ai_unavailable: '🤖 Layanan AI sedang tidak tersedia. Silakan coba lagi nanti.',
  ai_empty_input: 'Penggunaan: !ai <pesan>\nContoh: !ai Apa itu TypeScript?',
  ai_history_cleared: '🧹 Riwayat percakapan AI telah dihapus.',
  ai_thinking: '🤔 Sedang berpikir...',

  memory_cleared: '🧹 Semua memori telah dihapus.',
  memory_fact_saved: '💾 Baik! Saya akan mengingatnya.',

  mod_warning: '⚠️ Pesan Anda ditandai. Harap bersikap sopan.',
  mod_blocked: '🚫 Pesan Anda diblokir oleh moderasi.',
  mod_muted: '🔇 Anda sementara dibisukan.',

  broadcast_received: '📢 **Pengumuman**\n{content}',

  flow_expired: '⏰ Alur percakapan ini telah kedaluwarsa. Silakan mulai lagi.',
  flow_cancelled: '❌ Alur dibatalkan.',
  flow_completed: '✅ Selesai! Terima kasih.',
  flow_invalid_input: '⚠️ Input tidak valid. {hint}',

  summary_title: '📝 **Ringkasan Percakapan**',
  summary_empty: 'Tidak ada riwayat percakapan untuk diringkas.',

  welcome_message: '👋 Selamat datang, {name}! Saya asisten AI Anda. Ketik !help untuk memulai.',
  welcome_back: '👋 Selamat datang kembali, {name}!',
};

const locales: Record<Locale, I18nMessages> = { en, id };

export class I18n {
  private defaultLocale: Locale;

  constructor(defaultLocale: Locale = 'en') {
    this.defaultLocale = defaultLocale;
  }

  t(
    key: keyof I18nMessages,
    params?: Record<string, string | number>,
    locale?: Locale
  ): string {
    const lang = locale ?? this.defaultLocale;
    const messages = locales[lang] ?? locales['en'];
    let message = messages[key] ?? locales['en'][key] ?? key;

    if (params) {
      for (const [param, value] of Object.entries(params)) {
        message = message.replace(new RegExp(`\\{${param}\\}`, 'g'), String(value));
      }
    }

    return message;
  }

  /**
   * Detect locale from user settings or message content.
   */
  detectLocale(userSettings?: Record<string, any>): Locale {
    const lang = userSettings?.language;
    if (lang === 'id' || lang === 'in') return 'id';
    if (lang === 'en') return 'en';
    return this.defaultLocale;
  }

  getSupportedLocales(): Locale[] {
    return Object.keys(locales) as Locale[];
  }
}
