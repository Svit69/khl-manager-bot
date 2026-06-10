const roundSalaryRub = (value) => {
  const salary = Math.max(500000, Number(value) || 0);
  const step = salary <= 10000000 ? 500000 : 1000000;
  return Math.round(salary / step) * step;
};

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

  if (ovr <= FALLBACK_SALARY_CURVE[0][0]) return roundSalaryRub(FALLBACK_SALARY_CURVE[0][1]);
  for (let index = 1; index < FALLBACK_SALARY_CURVE.length; index++) {
    const [rightOvr, rightSalary] = FALLBACK_SALARY_CURVE[index];
    const [leftOvr, leftSalary] = FALLBACK_SALARY_CURVE[index - 1];
    if (ovr <= rightOvr) {
      const ratio = (ovr - leftOvr) / Math.max(1, rightOvr - leftOvr);
      return roundSalaryRub(leftSalary + (rightSalary - leftSalary) * ratio);
    }
  }

  const [lastOvr, lastSalary] = FALLBACK_SALARY_CURVE[FALLBACK_SALARY_CURVE.length - 1];
  return roundSalaryRub(lastSalary + Math.max(0, ovr - lastOvr) * 12000000);
};
