const POSITION_BUDGET_SHARE = Object.freeze({ CTR: 0.2, LW: 0.2, RW: 0.2, DEF: 0.28, G: 0.12 });
const salaryMillions = (rub) => (Number(rub) || 0) / 1000000;
export class DraftSalaryCapStrategy {
  assessCandidate(context) {
    if (!context?.enabled) return { score: 0, isViable: true };
    const salaryRub = Number(context.salaryRub) || 0;
    const projectedPayrollRub = context.payrollRub + salaryRub;
    const remainingAfterPick = Math.max(0, context.remainingPicks - 1);
    const reserveRub = this.#calculateRequiredReserveRub(context, remainingAfterPick);
    const isViable = projectedPayrollRub + reserveRub <= context.capRub || remainingAfterPick === 0;
    return {
      isViable,
      score: this.#scoreBudgetFit(context, projectedPayrollRub, reserveRub) + this.#scoreValueFit(context),
    };
  }
  #calculateRequiredReserveRub(context, remainingAfterPick) {
    if (Number(context.requiredReserveRub) > 0) return Number(context.requiredReserveRub);
    const minimumSalaryRub = Math.max(2500000, context.capRub * 0.006);
    const plannedAverageRub = context.capRub / Math.max(1, context.rounds);
    const pressureAverageRub = Math.max(minimumSalaryRub, plannedAverageRub * (context.round <= 8 ? 0.82 : 0.68));
    return remainingAfterPick * pressureAverageRub;
  }
  #scoreBudgetFit(context, projectedPayrollRub, reserveRub) {
    const capUsage = projectedPayrollRub / Math.max(1, context.capRub);
    const plannedUsage = context.round <= 8 ? 0.14 + context.round * 0.055 : (context.round <= 15 ? 0.58 + (context.round - 8) * 0.045 : 0.9 + (context.round - 15) * 0.012);
    const pressure = Math.max(0, capUsage - plannedUsage);
    const completionGap = Math.max(0, projectedPayrollRub + reserveRub - context.capRub);
    const isHighCap = context.capRub >= 800000000;
    const earlyStarPass = isHighCap && context.round <= 6 && context.ovr >= 84 && context.expensiveStars < 4 ? 28 : 0;
    return earlyStarPass - pressure * (isHighCap ? 42 : 78) - salaryMillions(completionGap) * (isHighCap ? 0.35 : 0.58);
  }
  #scoreValueFit(context) {
    const isHighCap = context.capRub >= 800000000;
    const salaryM = Math.max(1, salaryMillions(context.salaryRub));
    const valueScore = (context.ovr - 62) / salaryM;
    const fairSalaryM = Math.max(3, (context.ovr - 62) * 2.1);
    const luxuryPenalty = Math.max(0, salaryM - fairSalaryM) * (isHighCap ? (context.round <= 8 ? 0.15 : 0.45) : (context.round <= 8 ? 0.35 : 0.95));
    const upsideBonus = context.age <= 24 && context.potential >= context.ovr + 4 && salaryM <= fairSalaryM ? (isHighCap ? 3 : 6) : 0;
    const qualitySalaryBonus = isHighCap && context.round <= 14 && context.ovr >= 80 ? Math.min(25, salaryM * 0.18) : 0;
    const capUsage = (context.payrollRub + context.salaryRub) / Math.max(1, context.capRub);
    const plannedUsage = context.round <= 8 ? 0.14 + context.round * 0.055 : (context.round <= 15 ? 0.58 + (context.round - 8) * 0.045 : 0.9 + (context.round - 15) * 0.012);
    const spendUpBonus = isHighCap && capUsage < plannedUsage - 0.1 && context.ovr >= 74 ? Math.min(60, salaryM * 0.45) : 0;
    const positionShare = POSITION_BUDGET_SHARE[context.positionKey] || 0.18;
    const positionLimitM = salaryMillions(context.capRub) * positionShare;
    const positionPressure = Math.max(0, salaryMillions(context.positionPayrollRub + context.salaryRub) - positionLimitM);
    return valueScore * (isHighCap ? 0.5 : 8) + upsideBonus + qualitySalaryBonus + spendUpBonus - luxuryPenalty - positionPressure * (isHighCap ? 0.18 : 0.55);
  }
}
