const sheetsModule = require('../dist/sheets');

describe('Google Sheets dashboard layout', () => {
  it('builds a single rolling dashboard with daily, weekly, and monthly sections', () => {
    expect(typeof sheetsModule.buildDashboardSheetData).toBe('function');

    const ranges = sheetsModule.buildDashboardSheetData();
    const text = JSON.stringify(ranges);

    expect(text).toContain('RINGKASAN REPORT TIKET');
    expect(text).toContain('Daily');
    expect(text).toContain('Weekly');
    expect(text).toContain('Monthly');
    expect(text).toContain('STATUS HARIAN');
    expect(text).toContain('STATUS MINGGUAN');
    expect(text).toContain('STATUS BULANAN');
    expect(text).toContain('CURRENT BACKLOG SAAT INI');
    expect(text).toContain('ALERT OTOMATIS (LIVE)');
    expect(text).toContain('SEGMENTASI BACKLOG (OPEN/IN_PROGRESS/ESCALATED)');
    expect(text).toContain('KPI OPERASIONAL INTI (MTD)');
    expect(text).toContain('TARGET VS ACTUAL (MTD)');
    expect(text).toContain('DRILL-DOWN TINDAKAN (ACTIONABLE)');
    expect(text).toContain('TOP BREACH CONTRIBUTOR (CUSTOMER)');
    expect(text).toContain('TREND BULAN BERJALAN (TGL 1-SAAT INI)');
    expect(text).toContain('SLA BREACH REPORT');
    expect(text).toContain('PRIORITY TREND BULAN BERJALAN (TGL 1-SAAT INI)');
    const monthStartMatches = text.match(/DATE\(YEAR\(TODAY\(\)\),MONTH\(TODAY\(\)\),1\)/g) ?? [];
    expect(monthStartMatches.length).toBeGreaterThan(1);

    const mainTrend = ranges.find((range) => range.range === 'dashboard!A36:C66');
    const priorityTrend = ranges.find((range) => range.range === 'dashboard!E36:I66');
    expect(mainTrend).toBeDefined();
    expect(priorityTrend).toBeDefined();
    expect(String(mainTrend.values[0][0])).toContain('DATE(YEAR(TODAY()),MONTH(TODAY()),1)');
    expect(String(priorityTrend.values[0][0])).toContain('DATE(YEAR(TODAY()),MONTH(TODAY()),1)');
    expect(text).toContain("select C, count(C) where (upper(T)='OPEN' or upper(T)='IN_PROGRESS' or upper(T)='ESCALATED')");
    expect(text).toContain('TEXT(DATE(YEAR(TODAY()),MONTH(TODAY()),1),\\"yyyy-mm-dd\\")');
    expect(text).toContain('SELECT B,C,D,E,R,T,W,U WHERE (upper(T)=\'OPEN\' or upper(T)=\'IN_PROGRESS\' or upper(T)=\'ESCALATED\') ORDER BY W ASC LIMIT 10');
    expect(text).toContain('sum(Col2)');
    expect(text).toContain('QUERY(tickets!A2:T');
    expect(text).toContain('QUERY(tickets!A2:X');
    expect(text).toContain('QUERY(tickets!A2:W');
    expect(text).toContain('ROWS(QUERY(tickets!A2:T');
    expect(text).toContain('ROWS(QUERY(tickets!A2:X');
    expect(text).toContain('ROWS(QUERY(tickets!A2:W');
    expect(text).toContain('OFFSET(QUERY(tickets!A2:T');
    expect(text).toContain('OFFSET(QUERY(tickets!A2:X');
    expect(text).toContain('OFFSET(QUERY(tickets!A2:W');
    expect(text).toContain('{\\"No backlog data\\",\\"\\"}');
    expect(text).toContain('{\\"Belum ada tiket\\",\\"\\",\\"\\",\\"\\",\\"\\",\\"\\"}');
    expect(text).toContain('{\\"No active backlog\\",\\"\\",\\"\\",\\"\\",\\"\\",\\"\\",\\"\\",\\"\\"}');
    expect(text).toContain('{\\"No breach contributor\\",\\"\\"}');
    expect(text).toContain('{\\"No incident data\\",\\"\\"}');

    expect(text).not.toMatch(/dashboard[-_ ]?\d{4}/i);
  });
});