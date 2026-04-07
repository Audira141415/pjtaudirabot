const fs = require('node:fs');
const path = require('node:path');
const dotenv = require('dotenv');
const { google } = require('googleapis');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function main() {
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  const credentialsPath = process.env.GOOGLE_SHEETS_CREDENTIALS;

  if (!spreadsheetId) {
    throw new Error('GOOGLE_SHEETS_SPREADSHEET_ID is missing in .env');
  }

  if (!credentialsPath) {
    throw new Error('GOOGLE_SHEETS_CREDENTIALS is missing in .env');
  }

  const credRaw = fs.readFileSync(credentialsPath, 'utf8');
  const credentials = JSON.parse(credRaw);

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const sheets = google.sheets({ version: 'v4', auth });

  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const allSheets = meta.data.sheets || [];

  const ticketSheet = allSheets.find((s) => (s.properties?.title || '').toLowerCase() === 'tickets');
  if (!ticketSheet || !ticketSheet.properties?.sheetId) {
    throw new Error('Sheet "tickets" not found. Aborting to avoid deleting all tabs.');
  }

  const deleteRequests = allSheets
    .filter((s) => (s.properties?.title || '').toLowerCase() !== 'tickets')
    .map((s) => ({
      deleteSheet: { sheetId: s.properties.sheetId },
    }));

  if (deleteRequests.length > 0) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests: deleteRequests },
    });
  }

  const after = await sheets.spreadsheets.get({ spreadsheetId });
  const titles = (after.data.sheets || []).map((s) => s.properties?.title).filter(Boolean);

  console.log('Deleted tabs:', deleteRequests.length);
  console.log('Remaining tabs:', titles.join(', '));
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
