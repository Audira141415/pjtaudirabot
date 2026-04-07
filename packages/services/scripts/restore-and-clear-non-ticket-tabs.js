const fs = require('node:fs');
const path = require('node:path');
const dotenv = require('dotenv');
const { google } = require('googleapis');

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const SHEET_SCHEMAS = {
  tasks: ['ID', 'User', 'Title', 'Description', 'Status', 'Priority', 'Due Date', 'Created At'],
  notes: ['ID', 'User', 'Content', 'Tags', 'Created At'],
  reminders: ['ID', 'User', 'Message', 'Remind At', 'Status'],
  incidents: ['ID', 'User', 'Title', 'Issue', 'Root Cause', 'Solution', 'Created At'],
  logs: ['Timestamp', 'User', 'Message', 'Extracted Type'],
  tickets: ['ID', 'Ticket Number', 'Customer', 'Location', 'AO', 'SID', 'Service', 'VLAN ID', 'VLAN Type', 'VLAN Name', 'Hostname/Switch', 'Port', 'IP Address', 'Gateway', 'Subnet', 'Mode', 'Problem', 'Priority', 'Category', 'Status', 'Assigned To', 'Created By', 'Created At', 'Resolved At'],
  sla: ['ID', 'Ticket Number', 'Priority', 'Category', 'Response Target Min', 'Response Time Min', 'Response Breached', 'Resolution Target Min', 'Resolution Breached', 'Status', 'Created At'],
};

function columnLetter(index) {
  let letter = '';
  let n = index;
  while (n > 0) {
    n -= 1;
    letter = String.fromCharCode(65 + (n % 26)) + letter;
    n = Math.floor(n / 26);
  }
  return letter;
}

async function main() {
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  const credentialsPath = process.env.GOOGLE_SHEETS_CREDENTIALS;

  if (!spreadsheetId) throw new Error('GOOGLE_SHEETS_SPREADSHEET_ID is missing');
  if (!credentialsPath) throw new Error('GOOGLE_SHEETS_CREDENTIALS is missing');

  const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  const sheets = google.sheets({ version: 'v4', auth });

  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const existing = new Set((meta.data.sheets || []).map((s) => s.properties?.title).filter(Boolean));

  const missingTabs = Object.keys(SHEET_SCHEMAS).filter((name) => !existing.has(name));
  if (missingTabs.length > 0) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: missingTabs.map((name) => ({ addSheet: { properties: { title: name } } })),
      },
    });
  }

  for (const [name, headers] of Object.entries(SHEET_SCHEMAS)) {
    const endCol = columnLetter(headers.length);

    // Ensure header row exists and is correct
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${name}!A1:${endCol}1`,
      valueInputOption: 'RAW',
      requestBody: { values: [headers] },
    });

    // For non-ticket tabs: clear all data rows, keep header only
    if (name !== 'tickets') {
      await sheets.spreadsheets.values.clear({
        spreadsheetId,
        range: `${name}!A2:Z`,
      });
    }
  }

  const after = await sheets.spreadsheets.get({ spreadsheetId });
  const titles = (after.data.sheets || []).map((s) => s.properties?.title).filter(Boolean);

  console.log('Restored tabs:', missingTabs.length);
  console.log('All tabs now:', titles.join(', '));
  console.log('Non-ticket tabs cleared (header kept).');
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
