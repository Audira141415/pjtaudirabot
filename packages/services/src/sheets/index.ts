import { google, sheets_v4 } from 'googleapis';
import * as fs from 'node:fs';
import { ILogger } from '@pjtaudirabot/core';

// ── Sheet schemas matching spec Part 2 ──

const SHEET_SCHEMAS: Record<string, string[]> = {
  tasks: ['ID', 'User', 'Title', 'Description', 'Status', 'Priority', 'Due Date', 'Created At'],
  notes: ['ID', 'User', 'Content', 'Tags', 'Created At'],
  reminders: ['ID', 'User', 'Message', 'Remind At', 'Status'],
  incidents: ['ID', 'User', 'Title', 'Issue', 'Root Cause', 'Solution', 'Created At'],
  logs: ['Timestamp', 'User', 'Message', 'Extracted Type'],
  tickets: ['ID', 'Ticket Number', 'Customer', 'Location', 'AO', 'SID', 'Service', 'VLAN ID', 'VLAN Type', 'VLAN Name', 'Hostname/Switch', 'Port', 'IP Address', 'Gateway', 'Subnet', 'Mode', 'Problem', 'Priority', 'Category', 'Status', 'Assigned To', 'Created By', 'Created At', 'Resolved At'],
  sla: ['ID', 'Ticket Number', 'Priority', 'Category', 'Response Target Min', 'Response Time Min', 'Response Breached', 'Resolution Target Min', 'Resolution Breached', 'Status', 'Created At'],
  uptime: ['ID', 'Target Name', 'Host', 'Check Type', 'Status', 'Response Ms', 'Uptime %', 'Last Check', 'Last Down', 'Tags'],
  handover: ['ID', 'Shift', 'Date', 'Open Tickets', 'SLA Due Soon', 'SLA Breached', 'Critical Alerts', 'Active Incidents', 'Generated At'],
};

export interface SheetsConfig {
  credentials: string; // path to service account JSON or JSON string
  spreadsheetId?: string;
  ticketsOnly?: boolean;
}

type DashboardCellValue = string | number | boolean | null;
export interface DashboardRangeData {
  range: string;
  values: DashboardCellValue[][];
}

type DashboardPeriod = 'daily' | 'weekly' | 'monthly';

const DASHBOARD_STATUS_ORDER = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'ESCALATED'];
const BACKLOG_STATUS_ORDER = ['OPEN', 'IN_PROGRESS', 'ESCALATED', 'RESOLVED', 'CLOSED'];

function ticketDateExpr(columnLetter: 'W' | 'X'): string {
  return `IFERROR(DATEVALUE(LEFT(tickets!${columnLetter}2:${columnLetter},10)),0)`;
}

function periodDateConditions(columnLetter: 'W' | 'X', period: DashboardPeriod): string[] {
  const expr = ticketDateExpr(columnLetter);
  switch (period) {
    case 'daily':
      return [`--(${expr}=TODAY())`];
    case 'weekly':
      return [`--(${expr}>=TODAY()-6)`, `--(${expr}<=TODAY())`];
    case 'monthly':
      return [
        `--(${expr}>=DATE(YEAR(TODAY()),MONTH(TODAY()),1))`,
        `--(${expr}<=TODAY())`,
      ];
  }
}

function sumProductFormula(conditions: string[]): string {
  return `=SUMPRODUCT(${conditions.join(',')})`;
}

function createdCountFormula(period: DashboardPeriod): string {
  return sumProductFormula([
    '--(LEN(tickets!W2:W)>0)',
    ...periodDateConditions('W', period),
  ]);
}

function resolvedCountFormula(period: DashboardPeriod): string {
  return sumProductFormula([
    '--(LEN(tickets!X2:X)>0)',
    ...periodDateConditions('X', period),
  ]);
}

function statusCountFormula(period: DashboardPeriod, status: string): string {
  return sumProductFormula([
    `--(UPPER(tickets!T2:T)="${status}")`,
    '--(LEN(tickets!W2:W)>0)',
    ...periodDateConditions('W', period),
  ]);
}

function priorityCountFormula(period: DashboardPeriod, priority: string): string {
  return sumProductFormula([
    `--(UPPER(tickets!R2:R)="${priority}")`,
    '--(LEN(tickets!W2:W)>0)',
    ...periodDateConditions('W', period),
  ]);
}

function currentStatusCountFormula(status: string): string {
  return `=COUNTIF(tickets!T2:T,"${status}")`;
}

function activeBacklogFormula(): string {
  return '=SUM(B26:B28)';
}

function slaDateExpr(): string {
  return 'IFERROR(DATEVALUE(LEFT(sla!K2:K,10)),0)';
}

function slaPeriodDateConditions(period: DashboardPeriod): string[] {
  const expr = slaDateExpr();
  switch (period) {
    case 'daily':
      return [`--(${expr}=TODAY())`];
    case 'weekly':
      return [`--(${expr}>=TODAY()-6)`, `--(${expr}<=TODAY())`];
    case 'monthly':
      return [
        `--(${expr}>=DATE(YEAR(TODAY()),MONTH(TODAY()),1))`,
        `--(${expr}<=TODAY())`,
      ];
  }
}

function slaBreachCountFormula(period: DashboardPeriod, breachType: 'response' | 'resolution'): string {
  const breachColumn = breachType === 'response' ? 'G' : 'I';
  return sumProductFormula([
    `--(UPPER(sla!${breachColumn}2:${breachColumn})="YES")`,
    '--(LEN(sla!K2:K)>0)',
    ...slaPeriodDateConditions(period),
  ]);
}

function monthTrendDateFormula(dayOfMonth: number): string {
  return `=IF(${dayOfMonth}<=DAY(TODAY()),DATE(YEAR(TODAY()),MONTH(TODAY()),${dayOfMonth}),"")`;
}

function createdOnDateFormula(dateCell: string): string {
  return sumProductFormula([
    '--(LEN(tickets!W2:W)>0)',
    `--(${ticketDateExpr('W')}=${dateCell})`,
  ]);
}

function resolvedOnDateFormula(dateCell: string): string {
  return sumProductFormula([
    '--(LEN(tickets!X2:X)>0)',
    `--(${ticketDateExpr('X')}=${dateCell})`,
  ]);
}

function priorityOnDateFormula(dateCell: string, priority: string): string {
  return sumProductFormula([
    `--(UPPER(tickets!R2:R)="${priority}")`,
    '--(LEN(tickets!W2:W)>0)',
    `--(${ticketDateExpr('W')}=${dateCell})`,
  ]);
}

function metricRows(): DashboardCellValue[][] {
  return [
    ['Created', createdCountFormula('daily'), createdCountFormula('weekly'), createdCountFormula('monthly')],
    ['Open', statusCountFormula('daily', 'OPEN'), statusCountFormula('weekly', 'OPEN'), statusCountFormula('monthly', 'OPEN')],
    ['Resolved', resolvedCountFormula('daily'), resolvedCountFormula('weekly'), resolvedCountFormula('monthly')],
    ['Critical', priorityCountFormula('daily', 'CRITICAL'), priorityCountFormula('weekly', 'CRITICAL'), priorityCountFormula('monthly', 'CRITICAL')],
    ['Escalated', statusCountFormula('daily', 'ESCALATED'), statusCountFormula('weekly', 'ESCALATED'), statusCountFormula('monthly', 'ESCALATED')],
  ];
}

function statusRows(period: DashboardPeriod): DashboardCellValue[][] {
  return DASHBOARD_STATUS_ORDER.map((status) => [status, statusCountFormula(period, status)]);
}

function backlogRows(): DashboardCellValue[][] {
  return [
    ['Total Active Backlog', activeBacklogFormula()],
    ...BACKLOG_STATUS_ORDER.map((status) => [status, currentStatusCountFormula(status)]),
  ];
}

function trendRows(days: number): DashboardCellValue[][] {
  return Array.from({ length: days }, (_, index) => {
    const rowNumber = 36 + index;
    const dayOfMonth = index + 1;
    const dateCell = `A${rowNumber}`;
    return [
      monthTrendDateFormula(dayOfMonth),
      createdOnDateFormula(dateCell),
      resolvedOnDateFormula(dateCell),
    ];
  });
}

function priorityTrendRows(days: number): DashboardCellValue[][] {
  return Array.from({ length: days }, (_, index) => {
    const rowNumber = 36 + index;
    const dayOfMonth = index + 1;
    const dateCell = `E${rowNumber}`;
    return [
      monthTrendDateFormula(dayOfMonth),
      priorityOnDateFormula(dateCell, 'CRITICAL'),
      priorityOnDateFormula(dateCell, 'HIGH'),
      priorityOnDateFormula(dateCell, 'MEDIUM'),
      priorityOnDateFormula(dateCell, 'LOW'),
    ];
  });
}

function slaRows(): DashboardCellValue[][] {
  return [
    ['Today', slaBreachCountFormula('daily', 'response'), slaBreachCountFormula('daily', 'resolution'), '=E25+F25'],
    ['Weekly', slaBreachCountFormula('weekly', 'response'), slaBreachCountFormula('weekly', 'resolution'), '=E26+F26'],
    ['Monthly', slaBreachCountFormula('monthly', 'response'), slaBreachCountFormula('monthly', 'resolution'), '=E27+F27'],
  ];
}

function alertRows(): DashboardCellValue[][] {
  return [
    ['Backlog Spike', '=B25', '=MAX(10,ROUNDUP(C7*0.4,0))', '=IF(B70>C70,"ALERT","OK")'],
    ['Daily Breach Rate', '=IF(B7=0,0,G25/B7)', '=0.2', '=IF(B71>C71,"ALERT","OK")'],
    ['Critical Spike', '=B10', '=MAX(1,ROUNDUP((C10/7)*2,0))', '=IF(B72>C72,"ALERT","OK")'],
  ];
}

function queryFallbackRow(columnCount: number, fallbackMessage: string): string {
  if (columnCount <= 1) {
    return `{"${fallbackMessage}"}`;
  }

  return `{"${fallbackMessage}",${Array.from({ length: columnCount - 1 }, () => '""').join(',')}}`;
}

function queryDataRowsFormula(queryFormula: string, fallbackMessage: string, columnCount: number): string {
  return `=IF(ROWS(${queryFormula})<=1,${queryFallbackRow(columnCount, fallbackMessage)},OFFSET(${queryFormula},1,0))`;
}

function segmentationQueryFormula(column: 'C' | 'D' | 'E' | 'G', label: 'Customer' | 'Location' | 'AO' | 'Service'): string {
  return queryDataRowsFormula(
    `QUERY(tickets!A2:T,"select ${column}, count(${column}) where (upper(T)='OPEN' or upper(T)='IN_PROGRESS' or upper(T)='ESCALATED') and ${column} is not null group by ${column} order by count(${column}) desc limit 10 label ${column} '${label}', count(${column}) 'Backlog'",0)`,
    'No backlog data',
    2
  );
}

function monthStartExpr(): string {
  return 'DATE(YEAR(TODAY()),MONTH(TODAY()),1)';
}

function ticketDateTimeExpr(columnLetter: 'W' | 'X'): string {
  return `IFERROR(DATEVALUE(LEFT(tickets!${columnLetter}2:${columnLetter},10))+IFERROR(TIMEVALUE(MID(tickets!${columnLetter}2:${columnLetter},12,8)),0),0)`;
}

function mttrHoursFormula(): string {
  const createdDt = ticketDateTimeExpr('W');
  const resolvedDt = ticketDateTimeExpr('X');
  return `=IFERROR(AVERAGE(FILTER((${resolvedDt}-${createdDt})*24,LEN(tickets!X2:X)>0,${resolvedDt}>=${monthStartExpr()},${resolvedDt}<=NOW())),0)`;
}

function mttfrMinutesFormula(): string {
  return `=IFERROR(AVERAGE(FILTER(sla!F2:F,LEN(sla!F2:F)>0,IFERROR(DATEVALUE(LEFT(sla!K2:K,10)),0)>=${monthStartExpr()},IFERROR(DATEVALUE(LEFT(sla!K2:K,10)),0)<=TODAY())),0)`;
}

function backlogAgingCountFormula(minHours: number, maxHours?: number): string {
  const createdDt = ticketDateTimeExpr('W');
  const ageHours = `(NOW()-${createdDt})*24`;
  const conditions = [
    '--(LEN(tickets!W2:W)>0)',
    '--((UPPER(tickets!T2:T)="OPEN")+(UPPER(tickets!T2:T)="IN_PROGRESS")+(UPPER(tickets!T2:T)="ESCALATED")>0)',
    `--(${ageHours}>=${minHours})`,
  ];

  if (typeof maxHours === 'number') {
    conditions.push(`--(${ageHours}<${maxHours})`);
  }

  return sumProductFormula(conditions);
}

function reopenedCountFormula(): string {
  return sumProductFormula([
    '--((UPPER(tickets!T2:T)="OPEN")+(UPPER(tickets!T2:T)="IN_PROGRESS")+(UPPER(tickets!T2:T)="ESCALATED")>0)',
    '--(LEN(tickets!X2:X)>0)',
    `--(${ticketDateExpr('X')}>=${monthStartExpr()})`,
    `--(${ticketDateExpr('X')}<=TODAY())`,
  ]);
}

function reopeningRateFormula(): string {
  return '=IFERROR(B113/MAX(1,D9),0)';
}

function kpiRows(): DashboardCellValue[][] {
  return [
    ['MTTR (Jam)', mttrHoursFormula(), 4, '=B107-C107', '=IF(B107<=C107,"HIJAU",IF(B107<=C107*1.25,"KUNING","MERAH"))'],
    ['MTTFR (Menit)', mttfrMinutesFormula(), 30, '=B108-C108', '=IF(B108<=C108,"HIJAU",IF(B108<=C108*1.25,"KUNING","MERAH"))'],
    ['Aging 0-4 Jam', backlogAgingCountFormula(0, 4), 20, '=B109-C109', '=IF(B109<=C109,"HIJAU",IF(B109<=C109*1.2,"KUNING","MERAH"))'],
    ['Aging 4-24 Jam', backlogAgingCountFormula(4, 24), 15, '=B110-C110', '=IF(B110<=C110,"HIJAU",IF(B110<=C110*1.2,"KUNING","MERAH"))'],
    ['Aging 1-3 Hari', backlogAgingCountFormula(24, 72), 10, '=B111-C111', '=IF(B111<=C111,"HIJAU",IF(B111<=C111*1.2,"KUNING","MERAH"))'],
    ['Aging >3 Hari', backlogAgingCountFormula(72), 5, '=B112-C112', '=IF(B112<=C112,"HIJAU",IF(B112<=C112*1.2,"KUNING","MERAH"))'],
    ['Reopened Count (MTD)', reopenedCountFormula(), 2, '=B113-C113', '=IF(B113<=C113,"HIJAU",IF(B113<=C113*1.5,"KUNING","MERAH"))'],
  ];
}

function targetVsActualRows(): DashboardCellValue[][] {
  return [
    ['SLA Compliance (MTD)', '=IFERROR(1-(SUMPRODUCT(--(LEN(sla!K2:K)>0),--(IFERROR(DATEVALUE(LEFT(sla!K2:K,10)),0)>=DATE(YEAR(TODAY()),MONTH(TODAY()),1)),--(IFERROR(DATEVALUE(LEFT(sla!K2:K,10)),0)<=TODAY()),--((UPPER(sla!G2:G)="YES")+(UPPER(sla!I2:I)="YES")>0))/MAX(1,SUMPRODUCT(--(LEN(sla!K2:K)>0),--(IFERROR(DATEVALUE(LEFT(sla!K2:K,10)),0)>=DATE(YEAR(TODAY()),MONTH(TODAY()),1)),--(IFERROR(DATEVALUE(LEFT(sla!K2:K,10)),0)<=TODAY())))),1)', 0.95, '=H107-I107', '=IF(H107>=I107,"HIJAU",IF(H107>=I107-0.05,"KUNING","MERAH"))'],
    ['Reopening Rate (MTD)', reopeningRateFormula(), 0.05, '=H108-I108', '=IF(H108<=I108,"HIJAU",IF(H108<=I108+0.03,"KUNING","MERAH"))'],
    ['MTTR (Jam)', '=B107', 4, '=H109-I109', '=IF(H109<=I109,"HIJAU",IF(H109<=I109*1.25,"KUNING","MERAH"))'],
    ['MTTFR (Menit)', '=B108', 30, '=H110-I110', '=IF(H110<=I110,"HIJAU",IF(H110<=I110*1.25,"KUNING","MERAH"))'],
  ];
}

function oldestOpenTicketsFormula(): string {
  return queryDataRowsFormula(
    'QUERY(tickets!A2:X,"SELECT B,C,D,E,R,T,W,U WHERE (upper(T)=\'OPEN\' or upper(T)=\'IN_PROGRESS\' or upper(T)=\'ESCALATED\') ORDER BY W ASC LIMIT 10",0)',
    'No active backlog',
    8
  );
}

function topBreachContributorFormula(): string {
  return queryDataRowsFormula(
    'QUERY({tickets!C2:C,IF((IFNA(VLOOKUP(tickets!B2:B,sla!B2:I,6,FALSE),"NO")="YES")+(IFNA(VLOOKUP(tickets!B2:B,sla!B2:I,8,FALSE),"NO")="YES")>0,1,0)},"select Col1, sum(Col2) where Col1 is not null group by Col1 order by sum(Col2) desc limit 10 label Col1 \"Customer\", sum(Col2) \"Breach Count\"",0)',
    'No breach contributor',
    2
  );
}

function topIncidentFormula(column: 'C' | 'D', label: 'Customer' | 'Location'): string {
  return queryDataRowsFormula(
    `QUERY(tickets!A2:W,"select ${column}, count(${column}) where ${column} is not null and W is not null and W >= '"&TEXT(${monthStartExpr()},"yyyy-mm-dd")&"' group by ${column} order by count(${column}) desc limit 10 label ${column} '${label}', count(${column}) 'Incident'",0)`,
    'No incident data',
    2
  );
}

export function buildDashboardSheetData(): DashboardRangeData[] {
  return [
    { range: 'dashboard!A1', values: [['AUDIRA — Rolling Ticket Dashboard']] },
    { range: 'dashboard!A2:B2', values: [['Terakhir diperbarui:', '=TEXT(NOW(),"DD/MM/YYYY HH:mm")&" WIB"']] },
    { range: 'dashboard!A3:H3', values: [['Mode: satu sheet tetap, metrik rolling harian, mingguan (7 hari), dan bulanan (bulan berjalan mulai tanggal 1). Tidak membuat sheet baru saat ganti hari.']] },

    { range: 'dashboard!A5', values: [['RINGKASAN REPORT TIKET']] },
    { range: 'dashboard!A6:D6', values: [['Metric', 'Daily', 'Weekly', 'Monthly']] },
    { range: 'dashboard!A7:D11', values: metricRows() },

    { range: 'dashboard!A14', values: [['STATUS HARIAN']] },
    { range: 'dashboard!A15:B15', values: [['Status', 'Jumlah']] },
    { range: 'dashboard!A16:B20', values: statusRows('daily') },

    { range: 'dashboard!D14', values: [['STATUS MINGGUAN']] },
    { range: 'dashboard!D15:E15', values: [['Status', 'Jumlah']] },
    { range: 'dashboard!D16:E20', values: statusRows('weekly') },

    { range: 'dashboard!G14', values: [['STATUS BULANAN']] },
    { range: 'dashboard!G15:H15', values: [['Status', 'Jumlah']] },
    { range: 'dashboard!G16:H20', values: statusRows('monthly') },

    { range: 'dashboard!A23', values: [['CURRENT BACKLOG SAAT INI']] },
    { range: 'dashboard!A24:B24', values: [['Status', 'Jumlah']] },
    { range: 'dashboard!A25:B30', values: backlogRows() },

    { range: 'dashboard!D23', values: [['SLA BREACH REPORT']] },
    { range: 'dashboard!D24:G24', values: [['Period', 'Response Breach', 'Resolution Breach', 'Total Breach']] },
    { range: 'dashboard!D25:G27', values: slaRows() },

    { range: 'dashboard!A33', values: [['TREND BULAN BERJALAN (TGL 1-SAAT INI)']] },
    { range: 'dashboard!A34:C34', values: [['Tanggal', 'Created', 'Resolved']] },
    { range: 'dashboard!A36:C66', values: trendRows(31) },

    { range: 'dashboard!E33', values: [['PRIORITY TREND BULAN BERJALAN (TGL 1-SAAT INI)']] },
    { range: 'dashboard!E34:I34', values: [['Tanggal', 'Critical', 'High', 'Medium', 'Low']] },
    { range: 'dashboard!E36:I66', values: priorityTrendRows(31) },

    { range: 'dashboard!A68', values: [['ALERT OTOMATIS (LIVE)']] },
    { range: 'dashboard!A69:D69', values: [['Alert', 'Current Value', 'Threshold', 'Status']] },
    { range: 'dashboard!A70:D72', values: alertRows() },

    { range: 'dashboard!A74', values: [['SEGMENTASI BACKLOG (OPEN/IN_PROGRESS/ESCALATED)']] },
    { range: 'dashboard!A75:H75', values: [['Customer', 'Backlog', 'Location', 'Backlog', 'AO', 'Backlog', 'Service', 'Backlog']] },
    { range: 'dashboard!A76', values: [[segmentationQueryFormula('C', 'Customer')]] },
    { range: 'dashboard!C76', values: [[segmentationQueryFormula('D', 'Location')]] },
    { range: 'dashboard!E76', values: [[segmentationQueryFormula('E', 'AO')]] },
    { range: 'dashboard!G76', values: [[segmentationQueryFormula('G', 'Service')]] },

    { range: 'dashboard!A90', values: [['10 TIKET TERAKHIR']] },
    { range: 'dashboard!A91:F91', values: [['Ticket #', 'Customer', 'Prioritas', 'Status', 'Dibuat', 'Assignee']] },
    { range: 'dashboard!A92', values: [[queryDataRowsFormula('QUERY(tickets!A2:X,"SELECT B,C,R,T,W,U ORDER BY W DESC LIMIT 10",0)', 'Belum ada tiket', 6)]] },

    { range: 'dashboard!A105', values: [['KPI OPERASIONAL INTI (MTD)']] },
    { range: 'dashboard!A106:E106', values: [['KPI', 'Actual', 'Target', 'Gap', 'Status']] },
    { range: 'dashboard!A107:E113', values: kpiRows() },

    { range: 'dashboard!G105', values: [['TARGET VS ACTUAL (MTD)']] },
    { range: 'dashboard!G106:K106', values: [['Metric', 'Actual', 'Target', 'Gap', 'Status']] },
    { range: 'dashboard!G107:K110', values: targetVsActualRows() },

    { range: 'dashboard!A116', values: [['DRILL-DOWN TINDAKAN (ACTIONABLE)']] },
    { range: 'dashboard!A117:H117', values: [['Ticket #', 'Customer', 'Location', 'AO', 'Priority', 'Status', 'Created At', 'Assignee']] },
    { range: 'dashboard!A118', values: [[oldestOpenTicketsFormula()]] },

    { range: 'dashboard!A130', values: [['TOP BREACH CONTRIBUTOR (CUSTOMER)']] },
    { range: 'dashboard!A131:B131', values: [['Customer', 'Breach Count']] },
    { range: 'dashboard!A132', values: [[topBreachContributorFormula()]] },

    { range: 'dashboard!D130', values: [['TOP INCIDENT CUSTOMER (MTD)']] },
    { range: 'dashboard!D131:E131', values: [['Customer', 'Incident']] },
    { range: 'dashboard!D132', values: [[topIncidentFormula('C', 'Customer')]] },

    { range: 'dashboard!G130', values: [['TOP INCIDENT LOCATION (MTD)']] },
    { range: 'dashboard!G131:H131', values: [['Location', 'Incident']] },
    { range: 'dashboard!G132', values: [[topIncidentFormula('D', 'Location')]] },
  ];
}

export class GoogleSheetsService {
  private sheets: sheets_v4.Sheets | null = null;
  private spreadsheetId: string | null;
  private logger: ILogger;
  private ensuredSheets = new Set<string>();
  private ticketsOnly: boolean;

  constructor(config: SheetsConfig, logger: ILogger) {
    this.logger = logger.child({ service: 'google-sheets' });
    this.spreadsheetId = config.spreadsheetId ?? null;
    this.ticketsOnly = config.ticketsOnly ?? false;
    this.initClient(config.credentials);
    if (!this.spreadsheetId) {
      this.logger.warn('Google Sheets spreadsheetId is missing; sheet writes are disabled');
    }
  }

  private isSheetAllowed(sheetName: string): boolean {
    if (!this.ticketsOnly) return true;
    return sheetName === 'tickets' || sheetName === 'dashboard';
  }

  private initClient(credentials: string): void {
    try {
      let credJson: Record<string, unknown>;
      try {
        credJson = JSON.parse(credentials);
      } catch {
        // Treat as file path
        credJson = JSON.parse(fs.readFileSync(credentials, 'utf-8'));
      }

      const auth = new google.auth.GoogleAuth({
        credentials: credJson as any,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });

      this.sheets = google.sheets({ version: 'v4', auth });
      this.logger.info('Google Sheets client initialized');
    } catch (error) {
      this.logger.error('Failed to initialize Google Sheets', error as Error);
    }
  }

  isAvailable(): boolean {
    return this.sheets !== null && this.spreadsheetId !== null;
  }

  /**
   * Create a new spreadsheet or use existing one.
   */
  async ensureSpreadsheet(title: string): Promise<string> {
    if (this.spreadsheetId) return this.spreadsheetId;
    if (!this.sheets) throw new Error('Sheets client not initialized');

    const response = await this.sheets.spreadsheets.create({
      requestBody: { properties: { title } },
    });

    this.spreadsheetId = response.data.spreadsheetId!;
    this.logger.info('Spreadsheet created', { id: this.spreadsheetId, title });
    return this.spreadsheetId;
  }

  /**
   * Ensure a sheet (tab) exists in the spreadsheet.
   */
  async ensureSheet(sheetName: string): Promise<void> {
    if (!this.sheets || !this.spreadsheetId) return;

    // Skip API call if we already ensured this sheet in this process lifetime
    if (this.ensuredSheets.has(sheetName)) return;

    try {
      const meta = await this.sheets.spreadsheets.get({
        spreadsheetId: this.spreadsheetId,
      });

      const exists = meta.data.sheets?.some(
        (s) => s.properties?.title === sheetName
      );

      if (!exists) {
        await this.sheets.spreadsheets.batchUpdate({
          spreadsheetId: this.spreadsheetId,
          requestBody: {
            requests: [{ addSheet: { properties: { title: sheetName } } }],
          },
        });
        this.logger.info('Sheet created', { sheetName });
      }

      this.ensuredSheets.add(sheetName);
    } catch (error) {
      this.logger.error('Failed to ensure sheet', error as Error);
    }
  }

  /**
   * Append a row to a specific sheet.
   */
  async appendRow(sheetName: string, values: (string | number | boolean | null)[]): Promise<void> {
    if (!this.sheets || !this.spreadsheetId) return;

    try {
      await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.spreadsheetId,
        range: `${sheetName}!A:Z`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [values] },
      });
    } catch (error) {
      this.logger.error('Failed to append row', error as Error, { sheetName });
    }
  }

  /**
   * Append multiple rows at once.
   */
  async appendRows(sheetName: string, rows: (string | number | boolean | null)[][]): Promise<void> {
    if (!this.sheets || !this.spreadsheetId) return;

    try {
      await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.spreadsheetId,
        range: `${sheetName}!A:Z`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: rows },
      });
    } catch (error) {
      this.logger.error('Failed to append rows', error as Error, { sheetName });
    }
  }

  /**
   * Set header row for a sheet.
   */
  async setHeaders(sheetName: string, headers: string[]): Promise<void> {
    if (!this.sheets || !this.spreadsheetId) return;

    try {
      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: `${sheetName}!A1:${this.columnLetter(headers.length)}1`,
        valueInputOption: 'RAW',
        requestBody: { values: [headers] },
      });
    } catch (error) {
      this.logger.error('Failed to set headers', error as Error, { sheetName });
    }
  }

  /**
   * Read all rows from a sheet.
   */
  async readAll(sheetName: string): Promise<string[][]> {
    if (!this.sheets || !this.spreadsheetId) return [];

    try {
      const res = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${sheetName}!A:Z`,
      });
      return (res.data.values as string[][]) ?? [];
    } catch (error) {
      this.logger.error('Failed to read sheet', error as Error, { sheetName });
      return [];
    }
  }

  // ── High-level: appendToSheet() and sheet initialisation ──

  /**
   * The single entry-point required by Part 3.
   * Appends a row to the named sheet. Auto-creates the sheet if it doesn't exist.
   */
  async appendToSheet(
    sheetName: string,
    data: Record<string, string | number | boolean | null>
  ): Promise<void> {
    if (!this.sheets || !this.spreadsheetId) return;
    if (!this.isSheetAllowed(sheetName)) return;

    const headers = SHEET_SCHEMAS[sheetName];
    if (!headers) {
      this.logger.warn('appendToSheet called with unknown sheet', { sheetName });
      return;
    }

    // Lazy-ensure the tab exists the first time we write to it
    await this.ensureSheet(sheetName);

    const values = headers.map((h) => data[h] ?? '');
    await this.appendRow(sheetName, values);
  }

  /**
   * Initialize all required sheets with headers.
   */
  async initializeSheets(): Promise<void> {
    for (const [name, headers] of Object.entries(SHEET_SCHEMAS)) {
      if (!this.isSheetAllowed(name)) continue;
      await this.ensureSheet(name);
      await this.setHeaders(name, headers);
    }
    await this.initializeDashboardSheet();
    this.logger.info(this.ticketsOnly ? 'Ticket-only sheet initialized' : 'All sheets initialized');
  }

  /**
   * Retrieve the numeric sheetId of the 'dashboard' tab.
   */
  private async getDashboardSheetId(): Promise<number | null> {
    if (!this.sheets || !this.spreadsheetId) return null;
    try {
      const meta = await this.sheets.spreadsheets.get({ spreadsheetId: this.spreadsheetId });
      const sheet = meta.data.sheets?.find((s) => s.properties?.title === 'dashboard');
      return sheet?.properties?.sheetId ?? null;
    } catch {
      return null;
    }
  }

  /**
   * Apply visual formatting to the dashboard tab.
   * Colors, bold headers, and column widths.
   */
  private async applyDashboardFormatting(sheetId: number): Promise<void> {
    if (!this.sheets || !this.spreadsheetId) return;

    const titleBlue = { red: 0.102, green: 0.333, blue: 0.757 };
    const sectionBg = { red: 0.859, green: 0.914, blue: 0.996 };
    const headerBg = { red: 0.941, green: 0.941, blue: 0.941 };
    const white = { red: 1, green: 1, blue: 1 };

    type GridRange = { sheetId: number; startRowIndex: number; endRowIndex: number; startColumnIndex: number; endColumnIndex: number };
    const range = (r0: number, r1: number, c0: number, c1: number): GridRange => ({ sheetId, startRowIndex: r0, endRowIndex: r1, startColumnIndex: c0, endColumnIndex: c1 });

    const boldRequest = (r0: number, r1: number, c0: number, c1: number) => ({
      repeatCell: {
        range: range(r0, r1, c0, c1),
        cell: { userEnteredFormat: { textFormat: { bold: true } } },
        fields: 'userEnteredFormat.textFormat.bold',
      },
    });

    const sectionRanges: GridRange[] = [
      range(4, 5, 0, 4),
      range(13, 14, 0, 2),
      range(13, 14, 3, 5),
      range(13, 14, 6, 8),
      range(22, 23, 0, 2),
      range(22, 23, 3, 7),
      range(32, 33, 0, 3),
      range(32, 33, 4, 9),
      range(67, 68, 0, 4),
      range(73, 74, 0, 8),
      range(89, 90, 0, 6),
      range(104, 105, 0, 5),
      range(104, 105, 6, 11),
      range(115, 116, 0, 8),
      range(129, 130, 0, 8),
    ];
    const columnHeaderRanges: GridRange[] = [
      range(5, 6, 0, 4),
      range(14, 15, 0, 2),
      range(14, 15, 3, 5),
      range(14, 15, 6, 8),
      range(23, 24, 0, 2),
      range(23, 24, 3, 7),
      range(33, 34, 0, 3),
      range(33, 34, 4, 9),
      range(68, 69, 0, 4),
      range(74, 75, 0, 8),
      range(90, 91, 0, 6),
      range(105, 106, 0, 5),
      range(105, 106, 6, 11),
      range(116, 117, 0, 8),
      range(130, 131, 0, 8),
    ];

    const requests: object[] = [
      // Title row: dark blue bg, white bold text, fontSize 14
      {
        repeatCell: {
          range: range(0, 1, 0, 8),
          cell: {
            userEnteredFormat: {
              textFormat: { bold: true, fontSize: 14, foregroundColor: white },
              backgroundColor: titleBlue,
              verticalAlignment: 'MIDDLE',
            },
          },
          fields: 'userEnteredFormat(textFormat,backgroundColor,verticalAlignment)',
        },
      },
      // Freeze top rows
      {
        updateSheetProperties: {
          properties: { sheetId, gridProperties: { frozenRowCount: 2 } },
          fields: 'gridProperties.frozenRowCount',
        },
      },
      // Set row height for title
      {
        updateDimensionProperties: {
          range: { sheetId, dimension: 'ROWS', startIndex: 0, endIndex: 1 },
          properties: { pixelSize: 40 },
          fields: 'pixelSize',
        },
      },
    ];

    // Note row styling
    requests.push({
      repeatCell: {
        range: range(2, 3, 0, 8),
        cell: { userEnteredFormat: { textFormat: { italic: true, foregroundColor: { red: 0.3, green: 0.3, blue: 0.3 } } } },
        fields: 'userEnteredFormat.textFormat',
      },
    });

    // Section header blocks: light blue bg + bold
    for (const sectionRange of sectionRanges) {
      requests.push({
        repeatCell: {
          range: sectionRange,
          cell: { userEnteredFormat: { backgroundColor: sectionBg, textFormat: { bold: true } } },
          fields: 'userEnteredFormat(backgroundColor,textFormat.bold)',
        },
      });
    }

    // Column header rows: light gray bg + bold
    for (const headerRange of columnHeaderRanges) {
      requests.push({
        repeatCell: {
          range: headerRange,
          cell: { userEnteredFormat: { backgroundColor: headerBg, textFormat: { bold: true } } },
          fields: 'userEnteredFormat(backgroundColor,textFormat.bold)',
        },
      });
    }

    // Summary metrics rows are bold on label column
    requests.push(boldRequest(6, 11, 0, 1));
    requests.push(boldRequest(24, 30, 0, 1));
    requests.push(boldRequest(69, 72, 0, 1));
    requests.push(boldRequest(106, 113, 0, 1));
    requests.push(boldRequest(106, 110, 6, 7));

    // Color active backlog rows for quick visibility
    requests.push({
      repeatCell: {
        range: range(25, 26, 0, 2), // OPEN
        cell: { userEnteredFormat: { backgroundColor: { red: 0.996, green: 0.894, blue: 0.894 }, textFormat: { bold: true, foregroundColor: { red: 0.722, green: 0.11, blue: 0.11 } } } },
        fields: 'userEnteredFormat(backgroundColor,textFormat)',
      },
    });
    requests.push({
      repeatCell: {
        range: range(26, 27, 0, 2), // IN_PROGRESS
        cell: { userEnteredFormat: { backgroundColor: { red: 0.996, green: 0.941, blue: 0.796 }, textFormat: { bold: true, foregroundColor: { red: 0.571, green: 0.341, blue: 0.043 } } } },
        fields: 'userEnteredFormat(backgroundColor,textFormat)',
      },
    });
    requests.push({
      repeatCell: {
        range: range(27, 28, 0, 2), // ESCALATED
        cell: { userEnteredFormat: { backgroundColor: { red: 0.933, green: 0.894, blue: 0.996 }, textFormat: { bold: true, foregroundColor: { red: 0.353, green: 0.161, blue: 0.592 } } } },
        fields: 'userEnteredFormat(backgroundColor,textFormat)',
      },
    });

    // Column widths: A-I and chart anchor columns
    const colWidths: [number, number, number][] = [
      [0, 1, 170], [1, 2, 95], [2, 3, 95], [3, 4, 95],
      [4, 5, 95], [5, 6, 140], [6, 7, 95], [7, 8, 95],
      [8, 9, 95], [9, 10, 30], [10, 11, 120], [11, 12, 120], [12, 13, 120], [13, 14, 120],
    ];
    for (const [start, end, px] of colWidths) {
      requests.push({
        updateDimensionProperties: {
          range: { sheetId, dimension: 'COLUMNS', startIndex: start, endIndex: end },
          properties: { pixelSize: px },
          fields: 'pixelSize',
        },
      });
    }

    await this.sheets.spreadsheets.batchUpdate({
      spreadsheetId: this.spreadsheetId,
      requestBody: { requests },
    });
  }

  /**
   * Create and populate the 'dashboard' tab.
   * Uses COUNTIF/QUERY formulas so the counts auto-refresh whenever ticket data changes.
   * Only needs to run once — the formulas keep themselves up to date.
   */
  async initializeDashboardSheet(): Promise<void> {
    if (!this.sheets || !this.spreadsheetId) return;
    await this.ensureSheet('dashboard');

    try {
      await this.sheets.spreadsheets.values.clear({
        spreadsheetId: this.spreadsheetId,
        range: 'dashboard!A:Z',
      });

      await this.sheets.spreadsheets.values.batchUpdate({
        spreadsheetId: this.spreadsheetId,
        requestBody: {
          valueInputOption: 'USER_ENTERED',
          data: buildDashboardSheetData(),
        },
      });

      const sheetId = await this.getDashboardSheetId();
      if (sheetId !== null) {
        await this.applyDashboardFormatting(sheetId);
        await this.addDashboardCharts(sheetId);
      }

      this.logger.info('Dashboard sheet initialized');
    } catch (error) {
      this.logger.error('Failed to initialize dashboard sheet', error as Error);
    }
  }

  /**
   * Add rolling embedded charts to the dashboard tab.
   * Existing charts are removed first so restarts don't duplicate them.
   */
  private async addDashboardCharts(sheetId: number): Promise<void> {
    if (!this.sheets || !this.spreadsheetId) return;

    // Remove any charts already on the dashboard sheet to avoid duplicates on restart
    const meta = await this.sheets.spreadsheets.get({ spreadsheetId: this.spreadsheetId });
    const dashSheet = meta.data.sheets?.find((s) => s.properties?.sheetId === sheetId);
    const deleteRequests = (dashSheet?.charts ?? []).map((c) => ({
      deleteEmbeddedObject: { objectId: c.chartId },
    }));

    type Src = { sheetId: number; startRowIndex: number; endRowIndex: number; startColumnIndex: number; endColumnIndex: number };
    const src = (r0: number, r1: number, c0: number, c1: number): Src =>
      ({ sheetId, startRowIndex: r0, endRowIndex: r1, startColumnIndex: c0, endColumnIndex: c1 });

    const overlay = (rowIndex: number, columnIndex: number, w: number, h: number) => ({
      overlayPosition: {
        anchorCell: { sheetId, rowIndex, columnIndex },
        offsetXPixels: 10,
        offsetYPixels: 10,
        widthPixels: w,
        heightPixels: h,
      },
    });

    // Dashboard data row indices (0-based):
    // Summary labels A7:A11 = rows 6..10, daily/weekly/monthly series = B:D
    // Daily status A16:B20 = rows 15..19 cols 0..1
    // Weekly status D16:E20 = rows 15..19 cols 3..4
    // Monthly status G16:H20 = rows 15..19 cols 6..7
    // Backlog A25:B30 = rows 24..29 cols 0..1
    // SLA breach D25:G27 = rows 24..26 cols 3..6
    // Trend A36:C66 = rows 35..65 cols 0..2
    // Priority trend E36:I66 = rows 35..65 cols 4..8

    const addRequests = [
      // ── Summary chart ──
      {
        addChart: {
          chart: {
            spec: {
              title: 'Perbandingan Daily / Weekly / Monthly',
              titleTextFormat: { bold: true, fontSize: 12 },
              basicChart: {
                chartType: 'COLUMN',
                legendPosition: 'BOTTOM_LEGEND',
                axis: [
                  { position: 'BOTTOM_AXIS', title: 'Metric' },
                  { position: 'LEFT_AXIS', title: 'Jumlah' },
                ],
                domains: [{ domain: { sourceRange: { sources: [src(6, 11, 0, 1)] } } }],
                series: [
                  { series: { sourceRange: { sources: [src(6, 11, 1, 2)] } }, targetAxis: 'LEFT_AXIS' },
                  { series: { sourceRange: { sources: [src(6, 11, 2, 3)] } }, targetAxis: 'LEFT_AXIS' },
                  { series: { sourceRange: { sources: [src(6, 11, 3, 4)] } }, targetAxis: 'LEFT_AXIS' },
                ],
                headerCount: 0,
              },
            } as object,
            position: overlay(3, 9, 520, 300),
          },
        },
      },
      // ── Pie chart: Daily status ──
      {
        addChart: {
          chart: {
            spec: {
              title: 'Status Harian',
              titleTextFormat: { bold: true, fontSize: 12 },
              pieChart: {
                legendPosition: 'RIGHT_LEGEND',
                threeDimensional: false,
                domain: { sourceRange: { sources: [src(15, 20, 0, 1)] } },
                series: { sourceRange: { sources: [src(15, 20, 1, 2)] } },
              },
            } as object,
            position: overlay(23, 9, 420, 260),
          },
        },
      },
      // ── Pie chart: Weekly status ──
      {
        addChart: {
          chart: {
            spec: {
              title: 'Status Mingguan (7 Hari)',
              titleTextFormat: { bold: true, fontSize: 12 },
              pieChart: {
                legendPosition: 'RIGHT_LEGEND',
                threeDimensional: false,
                domain: { sourceRange: { sources: [src(15, 20, 3, 4)] } },
                series: { sourceRange: { sources: [src(15, 20, 4, 5)] } },
              },
            } as object,
            position: overlay(43, 9, 420, 260),
          },
        },
      },
      // ── Pie chart: Monthly status ──
      {
        addChart: {
          chart: {
            spec: {
              title: 'Status Bulanan (Bulan Berjalan)',
              titleTextFormat: { bold: true, fontSize: 12 },
              pieChart: {
                legendPosition: 'RIGHT_LEGEND',
                threeDimensional: false,
                domain: { sourceRange: { sources: [src(15, 20, 6, 7)] } },
                series: { sourceRange: { sources: [src(15, 20, 7, 8)] } },
              },
            } as object,
            position: overlay(43, 14, 420, 260),
          },
        },
      },
      // ── Backlog chart ──
      {
        addChart: {
          chart: {
            spec: {
              title: 'Current Backlog Saat Ini',
              titleTextFormat: { bold: true, fontSize: 12 },
              basicChart: {
                chartType: 'BAR',
                legendPosition: 'NO_LEGEND',
                axis: [
                  { position: 'BOTTOM_AXIS', title: 'Jumlah' },
                  { position: 'LEFT_AXIS', title: 'Status' },
                ],
                domains: [{ domain: { sourceRange: { sources: [src(24, 30, 0, 1)] } } }],
                series: [{ series: { sourceRange: { sources: [src(24, 30, 1, 2)] } }, targetAxis: 'BOTTOM_AXIS' }],
                headerCount: 0,
              },
            } as object,
            position: overlay(63, 9, 480, 280),
          },
        },
      },
      // ── Month-to-date trend chart ──
      {
        addChart: {
          chart: {
            spec: {
              title: 'Trend Bulan Berjalan (Tgl 1-Saat Ini)',
              titleTextFormat: { bold: true, fontSize: 12 },
              basicChart: {
                chartType: 'LINE',
                legendPosition: 'BOTTOM_LEGEND',
                axis: [
                  { position: 'BOTTOM_AXIS', title: 'Tanggal' },
                  { position: 'LEFT_AXIS', title: 'Jumlah Ticket' },
                ],
                domains: [{ domain: { sourceRange: { sources: [src(35, 66, 0, 1)] } } }],
                series: [
                  { series: { sourceRange: { sources: [src(35, 66, 1, 2)] } }, targetAxis: 'LEFT_AXIS' },
                  { series: { sourceRange: { sources: [src(35, 66, 2, 3)] } }, targetAxis: 'LEFT_AXIS' },
                ],
                headerCount: 0,
              },
            } as object,
            position: overlay(83, 9, 620, 320),
          },
        },
      },
      // ── Month-to-date priority trend chart ──
      {
        addChart: {
          chart: {
            spec: {
              title: 'Priority Trend Bulan Berjalan (Tgl 1-Saat Ini)',
              titleTextFormat: { bold: true, fontSize: 12 },
              basicChart: {
                chartType: 'LINE',
                legendPosition: 'BOTTOM_LEGEND',
                axis: [
                  { position: 'BOTTOM_AXIS', title: 'Tanggal' },
                  { position: 'LEFT_AXIS', title: 'Jumlah Ticket' },
                ],
                domains: [{ domain: { sourceRange: { sources: [src(35, 66, 4, 5)] } } }],
                series: [
                  { series: { sourceRange: { sources: [src(35, 66, 5, 6)] } }, targetAxis: 'LEFT_AXIS' },
                  { series: { sourceRange: { sources: [src(35, 66, 6, 7)] } }, targetAxis: 'LEFT_AXIS' },
                  { series: { sourceRange: { sources: [src(35, 66, 7, 8)] } }, targetAxis: 'LEFT_AXIS' },
                  { series: { sourceRange: { sources: [src(35, 66, 8, 9)] } }, targetAxis: 'LEFT_AXIS' },
                ],
                headerCount: 0,
              },
            } as object,
            position: overlay(119, 9, 620, 320),
          },
        },
      },
    ];

    await this.sheets.spreadsheets.batchUpdate({
      spreadsheetId: this.spreadsheetId,
      requestBody: { requests: [...deleteRequests, ...addRequests] },
    });

    this.logger.info('Dashboard charts added', { service: 'google-sheets' });
  }

  // ── Typed sync helpers matching spec Part 2 ──

  async syncTask(task: {
    id: string;
    user: string;
    title: string;
    description?: string;
    status: string;
    priority: string;
    dueDate?: Date | null;
    createdAt: Date;
  }): Promise<void> {
    await this.appendToSheet('tasks', {
      ID: task.id,
      User: task.user,
      Title: task.title,
      Description: task.description ?? '',
      Status: task.status,
      Priority: task.priority,
      'Due Date': task.dueDate ? task.dueDate.toISOString() : '',
      'Created At': task.createdAt.toISOString(),
    });
  }

  async syncNote(note: {
    id: string;
    user: string;
    content: string;
    tags: string[];
    createdAt: Date;
  }): Promise<void> {
    await this.appendToSheet('notes', {
      ID: note.id,
      User: note.user,
      Content: note.content,
      Tags: note.tags.join(', '),
      'Created At': note.createdAt.toISOString(),
    });
  }

  async syncReminder(reminder: {
    id: string;
    user: string;
    message: string;
    remindAt: Date;
    status: string;
  }): Promise<void> {
    await this.appendToSheet('reminders', {
      ID: reminder.id,
      User: reminder.user,
      Message: reminder.message,
      'Remind At': reminder.remindAt.toISOString(),
      Status: reminder.status,
    });
  }

  async syncIncident(incident: {
    id: string;
    user: string;
    title: string;
    issue: string;
    rootCause?: string;
    solution?: string;
    createdAt: Date;
  }): Promise<void> {
    await this.appendToSheet('incidents', {
      ID: incident.id,
      User: incident.user,
      Title: incident.title,
      Issue: incident.issue,
      'Root Cause': incident.rootCause ?? '',
      Solution: incident.solution ?? '',
      'Created At': incident.createdAt.toISOString(),
    });
  }

  async syncChatLog(log: {
    timestamp: Date;
    user: string;
    message: string;
    extractedType: string;
  }): Promise<void> {
    await this.appendToSheet('logs', {
      Timestamp: log.timestamp.toISOString(),
      User: log.user,
      Message: log.message,
      'Extracted Type': log.extractedType,
    });
  }

  async syncTicket(ticket: {
    id: string;
    ticketNumber: string;
    customer?: string;
    location?: string;
    ao?: string;
    sid?: string;
    service?: string;
    vlanId?: string;
    vlanType?: string;
    vlanName?: string;
    hostnameSwitch?: string;
    port?: string;
    ipAddress?: string;
    gateway?: string;
    subnet?: string;
    mode?: string;
    problem?: string;
    priority: string;
    category: string;
    status: string;
    assignedTo?: string;
    createdBy: string;
    createdAt: Date;
    resolvedAt?: Date | null;
  }): Promise<void> {
    if (!this.sheets || !this.spreadsheetId) return;
    await this.ensureSheet('tickets');

    const rowData: Record<string, string> = {
      ID: ticket.id,
      'Ticket Number': ticket.ticketNumber,
      Customer: ticket.customer ?? '',
      Location: ticket.location ?? '',
      AO: ticket.ao ?? '',
      SID: ticket.sid ?? '',
      Service: ticket.service ?? '',
      'VLAN ID': ticket.vlanId ?? '',
      'VLAN Type': ticket.vlanType ?? '',
      'VLAN Name': ticket.vlanName ?? '',
      'Hostname/Switch': ticket.hostnameSwitch ?? '',
      Port: ticket.port ?? '',
      'IP Address': ticket.ipAddress ?? '',
      Gateway: ticket.gateway ?? '',
      Subnet: ticket.subnet ?? '',
      Mode: ticket.mode ?? '',
      Problem: ticket.problem ?? '',
      Priority: ticket.priority,
      Category: ticket.category,
      Status: ticket.status,
      'Assigned To': ticket.assignedTo ?? '',
      'Created By': ticket.createdBy,
      'Created At': ticket.createdAt.toISOString(),
      'Resolved At': ticket.resolvedAt?.toISOString() ?? '',
    };

    const headers = SHEET_SCHEMAS.tickets;
    const values = headers.map((header) => rowData[header] ?? '');
    const rows = await this.readAll('tickets');
    const existingRowIndex = rows.findIndex((row, index) => index > 0 && row[0] === ticket.id);

    if (existingRowIndex >= 0) {
      const rowNumber = existingRowIndex + 1;
      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: `tickets!A${rowNumber}:${this.columnLetter(headers.length)}${rowNumber}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [values] },
      });
      return;
    }

    await this.appendRow('tickets', values);

    const appendedRows = await this.readAll('tickets');
    const appendedIndex = appendedRows.findIndex((row, index) => index > 0 && row[0] === ticket.id);
    if (appendedIndex < 0) {
      throw new Error(`Ticket ${ticket.ticketNumber} was not persisted to Google Sheets`);
    }
  }

  async syncSLA(sla: {
    id: string;
    ticketNumber: string;
    priority: string;
    category: string;
    responseTargetMin: number;
    responseTimeMin?: number | null;
    responseBreached: boolean;
    resolutionTargetMin: number;
    resolutionBreached: boolean;
    status: string;
    createdAt: Date;
  }): Promise<void> {
    await this.appendToSheet('sla', {
      ID: sla.id,
      'Ticket Number': sla.ticketNumber,
      Priority: sla.priority,
      Category: sla.category,
      'Response Target Min': sla.responseTargetMin,
      'Response Time Min': sla.responseTimeMin ?? '',
      'Response Breached': sla.responseBreached ? 'YES' : 'NO',
      'Resolution Target Min': sla.resolutionTargetMin,
      'Resolution Breached': sla.resolutionBreached ? 'YES' : 'NO',
      Status: sla.status,
      'Created At': sla.createdAt.toISOString(),
    });
  }

  private columnLetter(index: number): string {
    let letter = '';
    let n = index;
    while (n > 0) {
      n--;
      letter = String.fromCharCode(65 + (n % 26)) + letter;
      n = Math.floor(n / 26);
    }
    return letter;
  }
}
