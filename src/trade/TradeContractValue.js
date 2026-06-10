import { getFallbackMarketSalaryRub } from "../contracts/FallbackMarketSalary.js";
import { parseSeasonEnd } from "../contracts/SeasonUtils.js";

const getLatestContract = (contracts = []) =>
  [...contracts].sort((left, right) => String(left.season || "").localeCompare(String(right.season || ""))).slice(-1)[0];

const countRemainingYears = (contracts = [], seasonLabel = null) => {
  const currentSeasonEnd = parseSeasonEnd(seasonLabel);
  if (!currentSeasonEnd) return contracts.length;
  return contracts.filter((contract) => parseSeasonEnd(contract.season) >= currentSeasonEnd).length;
};

export const scoreTradeContractValue = (player, contracts = [], context = null, reasons = []) => {
  const latest = getLatestContract(contracts);
  if (!latest?.salaryRub) return 0;
  const market = getFallbackMarketSalaryRub(player);
  const salary = Math.max(1, Number(latest.salaryRub) || 0);
  const salaryRatio = salary / Math.max(1, market);
  const remainingYears = countRemainingYears(contracts, context?.seasonLabel);

  let score = 0;
  if (salaryRatio <= 0.8) {
    score += 10;
    reasons.push("выгодная зарплата относительно рынка");
  } else if (salaryRatio <= 1.1) {
    score += 2;
  } else if (salaryRatio <= 1.35) {
    score -= 6;
    reasons.push("зарплата выше рыночной оценки");
  } else if (salaryRatio <= 1.75) {
    score -= 16;
    reasons.push("дорогой контракт снижает ликвидность");
  } else if (salaryRatio <= 2.5) {
    score -= 48;
    reasons.push("сверхконтракт: зарплата примерно вдвое выше рынка");
  } else {
    score -= 78;
    reasons.push("токсичный сверхконтракт: зарплата кратно выше рынка");
  }

  if (remainingYears >= 2 && salaryRatio <= 0.9) score += Math.min(5, remainingYears + 1);
  if (remainingYears >= 2 && salaryRatio >= 1.5) {
    score -= Math.min(32, (remainingYears - 1) * 8);
    reasons.push("несколько лет дорогого контракта усиливают риск для ИИ");
  }
  return score;
};
