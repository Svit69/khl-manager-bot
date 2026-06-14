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
    const plannedUsage = Math.min(0.96, context.round / Math.max(1, context.rounds));
    const pressure = Math.max(0, capUsage - plannedUsage);
    const completionGap = Math.max(0, projectedPayrollRub + reserveRub - context.capRub);
    const earlyStarPass = context.round <= 4 && context.ovr >= 84 && context.expensiveStars < 2 ? 16 : 0;
    return earlyStarPass - pressure * 95 - salaryMillions(completionGap) * 0.55;
  }

  #scoreValueFit(context) {
    const salaryM = Math.max(1, salaryMillions(context.salaryRub));
    const valueScore = (context.ovr - 62) / salaryM;
    const fairSalaryM = Math.max(3, (context.ovr - 62) * 2.1);
    const luxuryPenalty = Math.max(0, salaryM - fairSalaryM) * (context.round <= 5 ? 0.55 : 1.05);
    const upsideBonus = context.age <= 24 && context.potential >= context.ovr + 4 && salaryM <= fairSalaryM ? 14 : 0;
    const positionShare = POSITION_BUDGET_SHARE[context.positionKey] || 0.18;
    const positionLimitM = salaryMillions(context.capRub) * positionShare;
    const positionPressure = Math.max(0, salaryMillions(context.positionPayrollRub + context.salaryRub) - positionLimitM);
    return valueScore * 16 + upsideBonus - luxuryPenalty - positionPressure * 0.7;
  }
}
