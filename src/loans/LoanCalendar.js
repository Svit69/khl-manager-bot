export class LoanCalendar {
  static seasonYear(season) {
    const match = /^(\d{4})\/(\d{4})$/.exec(season || "");
    return match && Number(match[2]) === Number(match[1]) + 1 ? Number(match[1]) : NaN;
  }
  static timestamp(value) {
    if (value instanceof Date) return value.getTime();
    if (typeof value !== "string") return NaN;
    return Date.parse(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00+03:00` : value);
  }
  static deadline(year) { return Date.parse(`${year + 1}-01-25T23:59:59.999+03:00`); }
  static birthYear(value) {
    if (value instanceof Date) return value.getUTCFullYear();
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || "");
    if (!match) return NaN;
    const date = new Date(`${value}T00:00:00Z`);
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value ? Number(match[1]) : NaN;
  }
  static beginning(year) { return Date.parse(`${year}-06-01T00:00:00+03:00`); }
  static endDate(year) { return `${year + 1}-05-31`; }
}
