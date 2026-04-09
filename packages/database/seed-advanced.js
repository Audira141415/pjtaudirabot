const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const db = new PrismaClient();

async function seed() {
  // 1. Message Templates
  const templates = [
    { name: 'Greeting Welcome', category: 'GREETING', body: 'Halo {{name}}! Selamat datang di layanan kami. Ada yang bisa kami bantu?', platform: 'ALL', variables: ['name'], isActive: true },
    { name: 'Away Message', category: 'AWAY', body: 'Terima kasih telah menghubungi kami. Saat ini kami sedang offline, akan kami balas segera.', platform: 'WHATSAPP', variables: [], isActive: true },
    { name: 'Quick Reply - Harga', category: 'QUICK_REPLY', body: 'Untuk info harga paket, silakan kunjungi: {{link}}', platform: 'ALL', variables: ['link'], isActive: true },
    { name: 'Follow Up Tiket', category: 'FOLLOW_UP', body: 'Halo {{name}}, kami ingin follow up tiket {{ticket_id}}. Apakah masalah sudah terselesaikan?', platform: 'ALL', variables: ['name', 'ticket_id'], isActive: true },
    { name: 'Promo Akhir Tahun', category: 'PROMOTION', body: 'Promo spesial akhir tahun! Diskon {{discount}}% untuk semua paket. Berlaku hingga {{date}}.', platform: 'WHATSAPP', variables: ['discount', 'date'], isActive: false },
    { name: 'Closing Thank You', category: 'CLOSING', body: 'Terima kasih {{name}}! Jika ada pertanyaan lain, jangan ragu menghubungi kami. ⭐', platform: 'ALL', variables: ['name'], isActive: true },
    { name: 'Notification Maintenance', category: 'NOTIFICATION', body: 'Pemberitahuan: Sistem akan maintenance pada {{date}} pukul {{time}}. Mohon maaf atas ketidaknyamanannya.', platform: 'TELEGRAM', variables: ['date', 'time'], isActive: true },
    { name: 'Custom Feedback', category: 'CUSTOM', body: 'Hai {{name}}, bagaimana pengalaman Anda menggunakan layanan kami? Reply 1-5 untuk rating.', platform: 'ALL', variables: ['name'], isActive: true },
  ];
  for (const t of templates) {
    await db.messageTemplate.create({ data: t });
  }
  console.log('Templates: ' + templates.length + ' seeded');

  // 2. Chatbot Flows
  const flows = [
    { name: 'Welcome Flow', description: 'Flow untuk menyambut user baru', nodes: [{ id: '1', type: 'start', text: 'User joins' }, { id: '2', type: 'message', text: 'Selamat datang!' }, { id: '3', type: 'menu', options: ['FAQ', 'Tiket Baru', 'Hubungi Admin'] }], edges: [{ from: '1', to: '2' }, { from: '2', to: '3' }], isActive: true, version: 1 },
    { name: 'Ticket Creation Flow', description: 'Alur pembuatan tiket otomatis', nodes: [{ id: '1', type: 'start' }, { id: '2', type: 'input', text: 'Subject' }, { id: '3', type: 'input', text: 'Description' }, { id: '4', type: 'action', text: 'Create Ticket' }], edges: [{ from: '1', to: '2' }, { from: '2', to: '3' }, { from: '3', to: '4' }], isActive: true, version: 2 },
    { name: 'FAQ Lookup', description: 'Pencarian FAQ otomatis', nodes: [{ id: '1', type: 'start' }, { id: '2', type: 'input', text: 'Keyword' }, { id: '3', type: 'search', text: 'Search FAQ' }], edges: [{ from: '1', to: '2' }, { from: '2', to: '3' }], isActive: false, version: 1 },
  ];
  for (const f of flows) {
    await db.chatbotFlow.create({ data: f });
  }
  console.log('Chatbot Flows: ' + flows.length + ' seeded');

  // 3. CSAT Surveys
  const csats = [
    { platform: 'WHATSAPP', contactId: 'user1', ticketId: 'TK-001', rating: 5, comment: 'Pelayanan sangat memuaskan, cepat dan ramah!' },
    { platform: 'TELEGRAM', contactId: 'user2', ticketId: 'TK-002', rating: 4, comment: 'Bagus, tapi bisa lebih cepat lagi' },
    { platform: 'WHATSAPP', contactId: 'user3', ticketId: 'TK-005', rating: 3, comment: null },
    { platform: 'TELEGRAM', contactId: 'user4', ticketId: 'TK-008', rating: 5, comment: 'Top! Sangat membantu' },
    { platform: 'WHATSAPP', contactId: 'user5', ticketId: 'TK-011', rating: 2, comment: 'Respon terlalu lama, harus diperbaiki' },
    { platform: 'WHATSAPP', contactId: 'user6', ticketId: 'TK-014', rating: 4, comment: 'Oke lah, lumayan puas' },
    { platform: 'TELEGRAM', contactId: 'user7', ticketId: 'TK-018', rating: 5, comment: '10/10 would recommend!' },
    { platform: 'WHATSAPP', contactId: 'user8', ticketId: 'TK-020', rating: 1, comment: 'Sangat kecewa, masalah tidak terselesaikan' },
    { platform: 'TELEGRAM', contactId: 'user9', ticketId: 'TK-022', rating: 4, comment: null },
    { platform: 'WHATSAPP', contactId: 'user10', ticketId: 'TK-025', rating: 3, comment: 'Standar sih' },
  ];
  for (const c of csats) {
    await db.cSATSurvey.create({ data: c });
  }
  console.log('CSAT: ' + csats.length + ' seeded');

  // 4. Agents
  const agents = [
    { name: 'Budi Santoso', email: 'budi@audira.id', role: 'ADMIN', status: 'ONLINE', maxConcurrent: 10, activeTickets: 3, totalResolved: 245, rating: 4.8 },
    { name: 'Siti Rahayu', email: 'siti@audira.id', role: 'SUPERVISOR', status: 'ONLINE', maxConcurrent: 8, activeTickets: 5, totalResolved: 180, rating: 4.6 },
    { name: 'Andi Wijaya', email: 'andi@audira.id', role: 'SENIOR_AGENT', status: 'BUSY', maxConcurrent: 6, activeTickets: 6, totalResolved: 312, rating: 4.9 },
    { name: 'Dewi Lestari', email: 'dewi@audira.id', role: 'AGENT', status: 'ONLINE', maxConcurrent: 5, activeTickets: 2, totalResolved: 98, rating: 4.3 },
    { name: 'Rudi Hermawan', email: 'rudi@audira.id', role: 'AGENT', status: 'AWAY', maxConcurrent: 5, activeTickets: 0, totalResolved: 156, rating: 4.1 },
    { name: 'Maya Sari', email: 'maya@audira.id', role: 'AGENT', status: 'OFFLINE', maxConcurrent: 5, activeTickets: 0, totalResolved: 67, rating: 4.5 },
    { name: 'Ahmad Fauzi', email: 'ahmad@audira.id', role: 'SENIOR_AGENT', status: 'ON_BREAK', maxConcurrent: 7, activeTickets: 0, totalResolved: 289, rating: 4.7 },
  ];
  for (const a of agents) {
    await db.agent.create({ data: a });
  }
  console.log('Agents: ' + agents.length + ' seeded');

  // 5. Tags
  const tags = [
    { name: 'Urgent', color: '#EF4444', category: 'priority', description: 'Needs immediate attention' },
    { name: 'VIP Customer', color: '#F59E0B', category: 'customer', description: 'High-value customer' },
    { name: 'Bug Report', color: '#8B5CF6', category: 'type', description: 'Software bug report' },
    { name: 'Feature Request', color: '#3B82F6', category: 'type', description: 'New feature request' },
    { name: 'Billing', color: '#10B981', category: 'department', description: 'Billing related issues' },
    { name: 'Technical', color: '#6366F1', category: 'department', description: 'Technical support' },
    { name: 'Resolved', color: '#22C55E', category: 'status', description: 'Issue has been resolved' },
    { name: 'Pending', color: '#F97316', category: 'status', description: 'Awaiting action' },
    { name: 'High Priority', color: '#DC2626', category: 'priority', description: 'High priority ticket' },
    { name: 'Low Priority', color: '#6B7280', category: 'priority', description: 'Low priority ticket' },
    { name: 'Enterprise', color: '#7C3AED', category: 'customer', description: 'Enterprise tier customer' },
    { name: 'Feedback', color: '#EC4899', category: 'type', description: 'Customer feedback' },
  ];
  for (const t of tags) {
    await db.tag.create({ data: t });
  }
  console.log('Tags: ' + tags.length + ' seeded');

  // 6. CRM Deals
  const deals = [
    { title: 'Enterprise Package - PT Maju Jaya', contactName: 'Budi Santoso', value: 15000000, currency: 'IDR', stage: 'NEGOTIATION', probability: 75, notes: 'Sedang negosiasi harga paket enterprise' },
    { title: 'Premium Plan - CV Berkah', contactName: 'Siti Rahayu', value: 5000000, currency: 'IDR', stage: 'PROPOSAL', probability: 50, notes: 'Proposal sudah dikirim' },
    { title: 'Basic Plan - Toko Makmur', contactName: 'Andi Wijaya', value: 1500000, currency: 'IDR', stage: 'LEAD', probability: 20 },
    { title: 'Enterprise - Bank Digital', contactName: 'Lisa Permata', value: 50000000, currency: 'IDR', stage: 'QUALIFIED', probability: 40, notes: 'Meeting terjadwal minggu depan' },
    { title: 'Premium - Startup Inovasi', contactName: 'Fahri Ibrahim', value: 8000000, currency: 'IDR', stage: 'WON', probability: 100, notes: 'Deal closed!', wonAt: new Date('2025-04-01') },
    { title: 'Basic - Warung Digital', contactName: 'Rina Wati', value: 1000000, currency: 'IDR', stage: 'LOST', probability: 0, notes: 'Budget terlalu kecil', lostAt: new Date('2025-03-20') },
    { title: 'Custom Solution - PT Global', contactName: 'Ahmad Fauzi', value: 25000000, currency: 'IDR', stage: 'NEGOTIATION', probability: 60 },
    { title: 'Team Plan - Agensi Kreatif', contactName: 'Dewi Lestari', value: 3500000, currency: 'IDR', stage: 'PROPOSAL', probability: 45 },
  ];
  for (const d of deals) {
    await db.cRMDeal.create({ data: d });
  }
  console.log('Deals: ' + deals.length + ' seeded');

  // 7. Managed Files
  const files = [
    { filename: 'company-logo.png', originalName: 'company-logo.png', mimeType: 'image/png', size: 245000, path: '/uploads/company-logo.png', category: 'image', uploadedBy: 'admin' },
    { filename: 'product-catalog.pdf', originalName: 'product-catalog-2025.pdf', mimeType: 'application/pdf', size: 2450000, path: '/uploads/product-catalog.pdf', category: 'document', uploadedBy: 'admin' },
    { filename: 'promo-video.mp4', originalName: 'promo-q1-2025.mp4', mimeType: 'video/mp4', size: 15000000, path: '/uploads/promo-video.mp4', category: 'video', uploadedBy: 'admin' },
    { filename: 'jingle.mp3', originalName: 'audira-jingle.mp3', mimeType: 'audio/mpeg', size: 3200000, path: '/uploads/jingle.mp3', category: 'audio', uploadedBy: 'admin' },
    { filename: 'terms-of-service.pdf', originalName: 'ToS-v2.pdf', mimeType: 'application/pdf', size: 890000, path: '/uploads/terms-of-service.pdf', category: 'document', uploadedBy: 'admin' },
    { filename: 'banner-promo.jpg', originalName: 'banner-promo-may.jpg', mimeType: 'image/jpeg', size: 456000, path: '/uploads/banner-promo.jpg', category: 'image', uploadedBy: 'admin' },
  ];
  for (const f of files) {
    await db.managedFile.create({ data: f });
  }
  console.log('Files: ' + files.length + ' seeded');

  // 8. API Keys
  const apiKeys = [
    { name: 'Production Bot Key', prefix: 'ak_prod', keyHash: crypto.createHash('sha256').update('ak_prod_' + crypto.randomBytes(16).toString('hex')).digest('hex'), permissions: ['read', 'write', 'admin'], isActive: true, lastUsedAt: new Date() },
    { name: 'Development Key', prefix: 'ak_dev', keyHash: crypto.createHash('sha256').update('ak_dev_' + crypto.randomBytes(16).toString('hex')).digest('hex'), permissions: ['read', 'write'], isActive: true },
    { name: 'Webhook Relay', prefix: 'ak_wh', keyHash: crypto.createHash('sha256').update('ak_wh_' + crypto.randomBytes(16).toString('hex')).digest('hex'), permissions: ['webhook'], isActive: true, lastUsedAt: new Date() },
    { name: 'Old Integration Key', prefix: 'ak_old', keyHash: crypto.createHash('sha256').update('ak_old_' + crypto.randomBytes(16).toString('hex')).digest('hex'), permissions: ['read'], isActive: false },
  ];
  for (const k of apiKeys) {
    await db.apiKey.create({ data: k });
  }
  console.log('API Keys: ' + apiKeys.length + ' seeded');

  // 9. Canned Responses
  const cannedResponses = [
    { shortcut: '/greeting', title: 'Salam Pembuka', content: 'Halo! Terima kasih telah menghubungi AudiraBot. Ada yang bisa kami bantu hari ini?', category: 'general', isActive: true },
    { shortcut: '/thanks', title: 'Terima Kasih', content: 'Terima kasih atas informasinya. Kami akan segera proses dan update Anda.', category: 'general', isActive: true },
    { shortcut: '/ticket-created', title: 'Tiket Dibuat', content: 'Tiket Anda telah dibuat dengan nomor {{ticket_id}}. Tim kami akan menangani segera.', category: 'ticket', isActive: true },
    { shortcut: '/escalated', title: 'Eskalasi', content: 'Masalah Anda telah kami eskalasi ke tim senior. Estimasi respon 1x24 jam.', category: 'ticket', isActive: true },
    { shortcut: '/resolved', title: 'Resolved', content: 'Masalah telah diselesaikan. Jika masih ada kendala, silakan hubungi kami kembali.', category: 'ticket', isActive: true },
    { shortcut: '/billing-info', title: 'Info Billing', content: 'Untuk info billing, silakan cek dashboard atau hubungi billing@audira.id', category: 'billing', isActive: true },
    { shortcut: '/refund', title: 'Proses Refund', content: 'Permintaan refund Anda sedang diproses. Estimasi 3-5 hari kerja.', category: 'billing', isActive: true },
    { shortcut: '/maintenance', title: 'Maintenance', content: 'Sistem sedang dalam maintenance terjadwal. Estimasi selesai: {{time}}.', category: 'technical', isActive: true },
    { shortcut: '/close', title: 'Penutup', content: 'Terima kasih! Jangan lupa beri rating layanan kami ya. Selamat beraktivitas! 😊', category: 'general', isActive: true },
  ];
  for (const r of cannedResponses) {
    await db.cannedResponse.create({ data: r });
  }
  console.log('Canned Responses: ' + cannedResponses.length + ' seeded');

  // 10. Webhook Logs
  const webhookLogs = [
    { webhookId: 'wh-tickets-1', url: 'https://api.example.com/webhook/tickets', method: 'POST', requestHeaders: { 'Content-Type': 'application/json' }, requestBody: { event: 'ticket.created', ticketId: 'TK-001' }, status: 'SUCCESS', responseStatus: 200, responseBody: '{"ok":true}', duration: 234 },
    { webhookId: 'wh-tickets-1', url: 'https://api.example.com/webhook/tickets', method: 'POST', requestHeaders: { 'Content-Type': 'application/json' }, requestBody: { event: 'ticket.updated', ticketId: 'TK-002' }, status: 'SUCCESS', responseStatus: 200, responseBody: '{"ok":true}', duration: 187 },
    { webhookId: 'wh-slack-1', url: 'https://slack.example.com/hook/abc', method: 'POST', requestHeaders: { 'Content-Type': 'application/json' }, requestBody: { text: 'New ticket created' }, status: 'FAILED', responseStatus: 500, responseBody: '{"error":"Internal Server Error"}', duration: 5023, retryCount: 3 },
    { webhookId: 'wh-payment-1', url: 'https://api.example.com/webhook/payments', method: 'POST', requestHeaders: { 'Content-Type': 'application/json' }, requestBody: { event: 'payment.received', amount: 5000000 }, status: 'SUCCESS', responseStatus: 201, responseBody: '{"received":true}', duration: 312 },
    { webhookId: 'wh-crm-1', url: 'https://crm.example.com/api/contact', method: 'PUT', requestHeaders: { 'Content-Type': 'application/json' }, requestBody: { event: 'contact.updated', contactId: 'C-001' }, status: 'RETRYING', responseStatus: 429, responseBody: '{"error":"Rate limit exceeded"}', duration: 102, retryCount: 1 },
    { webhookId: 'wh-analytics-1', url: 'https://analytics.example.com/event', method: 'POST', requestHeaders: { 'Content-Type': 'application/json' }, requestBody: { event: 'page.view', page: '/dashboard' }, status: 'PENDING', duration: 0 },
  ];
  for (const w of webhookLogs) {
    await db.webhookLog.create({ data: w });
  }
  console.log('Webhook Logs: ' + webhookLogs.length + ' seeded');

  // 11. Export Jobs
  const exports = [
    { module: 'tickets', format: 'CSV', status: 'COMPLETED', filters: { dateRange: '2025-01-01 to 2025-03-31' }, fileName: 'tickets-q1-2025.csv', fileSize: 45600, completedAt: new Date() },
    { module: 'contacts', format: 'XLSX', status: 'COMPLETED', filters: {}, fileName: 'all-contacts.xlsx', fileSize: 128000, completedAt: new Date() },
    { module: 'payments', format: 'PDF', status: 'PROCESSING', filters: { status: 'PAID' } },
    { module: 'sentiment', format: 'JSON', status: 'PENDING', filters: { sentiment: 'NEGATIVE' } },
    { module: 'tickets', format: 'CSV', status: 'FAILED', filters: { assignee: 'admin' }, error: 'Timeout: query took longer than 30s' },
  ];
  for (const e of exports) {
    await db.exportJob.create({ data: e });
  }
  console.log('Exports: ' + exports.length + ' seeded');

  // 12. Notification Rules
  const notifRules = [
    { name: 'New Ticket Alert', triggerEvent: 'TICKET_CREATED', conditions: [], actions: [{ type: 'notify' }], channels: ['DASHBOARD', 'TELEGRAM'], isActive: true },
    { name: 'SLA Breach Warning', triggerEvent: 'SLA_BREACH', conditions: [{ field: 'priority', op: 'eq', value: 'high' }], actions: [{ type: 'notify' }], channels: ['DASHBOARD', 'EMAIL', 'TELEGRAM'], isActive: true },
    { name: 'Payment Received', triggerEvent: 'PAYMENT_RECEIVED', conditions: [], actions: [{ type: 'notify' }], channels: ['DASHBOARD', 'WHATSAPP'], isActive: true },
    { name: 'Negative Sentiment', triggerEvent: 'NEGATIVE_SENTIMENT', conditions: [{ field: 'score', op: 'lt', value: 0.3 }], actions: [{ type: 'alert' }], channels: ['DASHBOARD'], isActive: true },
    { name: 'System Error', triggerEvent: 'SYSTEM_ERROR', conditions: [], actions: [{ type: 'escalate' }], channels: ['DASHBOARD', 'EMAIL', 'TELEGRAM', 'WEBHOOK'], isActive: true },
    { name: 'New Contact', triggerEvent: 'CONTACT_CREATED', conditions: [], actions: [{ type: 'notify' }], channels: ['DASHBOARD'], isActive: false },
  ];
  for (const n of notifRules) {
    await db.notificationRule.create({ data: n });
  }
  console.log('Notification Rules: ' + notifRules.length + ' seeded');

  // 13. Analytics Snapshots
  const now = new Date();
  const snapshots = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    snapshots.push({
      period: 'daily',
      date: d,
      metrics: {
        totalTickets: 100 + Math.floor(Math.random() * 50),
        resolvedTickets: 80 + Math.floor(Math.random() * 40),
        avgResponseTime: 10 + Math.floor(Math.random() * 20),
        csatScore: +(3.5 + Math.random() * 1.5).toFixed(2),
        activeUsers: 200 + Math.floor(Math.random() * 100),
        messagesSent: 500 + Math.floor(Math.random() * 300),
        revenue: 5000000 + Math.floor(Math.random() * 10000000),
      },
      breakdown: { source: 'auto-snapshot' },
    });
  }
  for (const s of snapshots) {
    await db.analyticsSnapshot.create({ data: s });
  }
  console.log('Analytics Snapshots: ' + snapshots.length + ' seeded');

  await db.$disconnect();
  console.log('\nAll advanced features seeded successfully!');
}

seed().catch(e => { console.error(e); process.exit(1); });
