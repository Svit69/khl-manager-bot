const MONTH_TITLE_FORMATTER = new Intl.DateTimeFormat("ru-RU", { month: "long", year: "numeric", timeZone: "UTC" });
const DAY_FORMATTER = new Intl.DateTimeFormat("ru-RU", { day: "numeric", timeZone: "UTC" });
const MONTH_SHORT_FORMATTER = new Intl.DateTimeFormat("ru-RU", { month: "short", timeZone: "UTC" });

const getValidDate = (dateIso) => {
  const date = new Date(dateIso);
  return Number.isNaN(date.getTime()) ? null : date;
};

export class CalendarScheduleDateFormatter {
  getMonthKey(row) {
    const date = getValidDate(row?.dateIso);
    return date ? `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}` : "unknown";
  }

  getMonthTitle(row) {
    const date = getValidDate(row?.dateIso);
    return date ? MONTH_TITLE_FORMATTER.format(date).toUpperCase() : "БЕЗ ДАТЫ";
  }

  getDayNumber(row) {
    const date = getValidDate(row?.dateIso);
    return date ? DAY_FORMATTER.format(date) : String(row?.day || "");
  }

  getShortMonth(row) {
    const date = getValidDate(row?.dateIso);
    return date ? MONTH_SHORT_FORMATTER.format(date).replace(".", "").toUpperCase() : "";
  }

  getMatchTime(match, row) {
    const hourSlot = this.#getStableSlot(`${match?.id || ""}:${row?.dateIso || ""}`);
    return hourSlot === 0 ? "17:00" : "19:30";
  }

  #getStableSlot(source) {
    let value = 0;
    for (let index = 0; index < source.length; index += 1) value = (value * 31 + source.charCodeAt(index)) % 997;
    return value % 2;
  }
}
