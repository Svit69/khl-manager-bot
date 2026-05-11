export const roundSalaryRub = (value) =>
  Math.max(500000, Math.round((Number(value) || 0) / 500000) * 500000);

const FALLBACK_SALARY_CURVE = Object.freeze([
  [60, 500000],
  [64, 1000000],
  [67, 2000000],
  [70, 5000000],
  [72, 8000000],
  [74, 12000000],
  [76, 18000000],
  [78, 26000000],
  [80, 36000000],
  [82, 50000000],
  [84, 65000000],
  [86, 82000000],
  [88, 100000000],
  [90, 120000000],
]);

export const getFallbackMarketSalaryRub = (playerOrOvr) => {
  const ovr = Number(typeof playerOrOvr === "number" ? playerOrOvr : playerOrOvr?.ovr) || 70;
  const curve = FALLBACK_SALARY_CURVE;

  if (ovr <= curve[0][0]) return roundSalaryRub(curve[0][1]);
  for (let index = 1; index < curve.length; index++) {
    const [rightOvr, rightSalary] = curve[index];
    const [leftOvr, leftSalary] = curve[index - 1];
    if (ovr <= rightOvr) {
      const ratio = (ovr - leftOvr) / Math.max(1, rightOvr - leftOvr);
      return roundSalaryRub(leftSalary + (rightSalary - leftSalary) * ratio);
    }
  }

  const [lastOvr, lastSalary] = curve[curve.length - 1];
  return roundSalaryRub(lastSalary + Math.max(0, ovr - lastOvr) * 12000000);
};

export const getPositionMarketGroup = (position) => {
  if (position === "\u0417\u0410\u0429") return "DEF";
  if (position === "\u0412\u0420\u0422") return "G";
  return "FWD";
};

export const getLatestContract = (contracts, getComparableValue) =>
  contracts.reduce((latest, current) => {
    if (!latest) return current;
    return getComparableValue(current) >= getComparableValue(latest) ? current : latest;
  }, null);

export const getSeasonLabelFromDate = (value) => {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return null;
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  return month >= 6 ? `${year}/${year + 1}` : `${year - 1}/${year}`;
};

export const isFutureSeason = (season, currentSeason, parseSeasonStart) => {
  if (!season || !currentSeason) return true;
  return parseSeasonStart(season) > parseSeasonStart(currentSeason);
};

export const getMoodTone = (state) => {
  if (state === "green") return "positive";
  if (state === "yellow") return "neutral";
  return "negative";
};

export const getMoodLabel = (state) => {
  if (state === "green") return "\u041e\u0442\u043b\u0438\u0447\u043d\u043e\u0435";
  if (state === "yellow") return "\u0421\u0442\u0430\u0431\u0438\u043b\u044c\u043d\u043e\u0435";
  if (state === "orange") return "\u041d\u0430\u043f\u0440\u044f\u0436\u0435\u043d\u043d\u043e\u0435";
  return "\u041f\u043b\u043e\u0445\u043e\u0435";
};
