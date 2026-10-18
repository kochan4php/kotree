// M67: audit-log CSV export. Import-free on purpose — the node unit tests
// (and the export route) share it without touching the Mongo layer.

export interface AuditCsvRow {
  event: string;
  detail?: string;
  ipHash?: string;
  at?: Date | string;
}

// RFC 4180 quoting: fields with a comma, quote or newline get wrapped and
// inner quotes doubled. The newline guard also stops CSV injection through
// spreadsheets treating the value as a formula start.
function field(value: string): string {
  const safe = /^[=+\-@]/.test(value) ? `'${value}` : value;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function toCsv(rows: AuditCsvRow[]): string {
  const lines = ['at,event,detail,ipHash'];
  for (const row of rows) {
    const when = row.at ? new Date(row.at) : null;
    const at = when && !Number.isNaN(when.getTime()) ? when.toISOString() : '';
    lines.push([field(at), field(row.event), field(row.detail ?? ''), field(row.ipHash ?? '')].join(','));
  }
  return lines.join('\r\n') + '\r\n';
}
