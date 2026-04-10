const DAY_MS = 24 * 60 * 60 * 1000;

const createUtcDate = (year, monthIndex, day) => new Date(Date.UTC(year, monthIndex, day));

const toIsoDate = (date) => {
  const safeDate = date instanceof Date ? date : new Date(date);
  return Number.isNaN(safeDate.getTime()) ? "" : safeDate.toISOString().slice(0, 10);
};

const addDays = (date, days) => new Date(date.getTime() + days * DAY_MS);

export const createPreseasonDates = (seasonStartYear) => {
  const safeYear = Number(seasonStartYear) || 2026;
  const anchors = [
    createUtcDate(safeYear, 5, 1),
    createUtcDate(safeYear, 5, 10),
    createUtcDate(safeYear, 5, 20),
    createUtcDate(safeYear, 6, 1),
    createUtcDate(safeYear, 6, 12),
    createUtcDate(safeYear, 6, 24),
    createUtcDate(safeYear, 7, 7),
    createUtcDate(safeYear, 7, 20),
    createUtcDate(safeYear, 8, 1),
  ];
  return anchors.map(toIsoDate);
};

export const getPreseasonDateAt = (dates, index) => {
  const safeDates = Array.isArray(dates) ? dates : [];
  if (!safeDates.length) return "";
  const safeIndex = Math.max(0, Math.min(safeDates.length - 1, Number(index) || 0));
  return safeDates[safeIndex] || "";
};

export const getPreseasonNextDate = (dates, index) => {
  const safeDates = Array.isArray(dates) ? dates : [];
  const nextIndex = Math.min(safeDates.length - 1, (Number(index) || 0) + 1);
  return getPreseasonDateAt(safeDates, nextIndex);
};

export const buildPreseasonDateLabel = (dateIso) => {
  const date = new Date(dateIso);
  if (Number.isNaN(date.getTime())) return "Межсезонье";
  return date.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
};

export const getPreseasonWindowGapDays = (currentDateIso, nextDateIso) => {
  const currentDate = new Date(currentDateIso);
  const nextDate = new Date(nextDateIso);
  if (Number.isNaN(currentDate.getTime()) || Number.isNaN(nextDate.getTime())) return 7;
  return Math.max(1, Math.round((nextDate.getTime() - currentDate.getTime()) / DAY_MS));
};
