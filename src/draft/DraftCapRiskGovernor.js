export class DraftCapRiskGovernor {
  assess(context) {
    if (!context.enabled || !context.capRub) return 0;
    const projectedPayrollRub = context.payrollRub + context.salaryRub;
    const projectedRemainingRub = context.capRub - projectedPayrollRub;
    const minimumReserveRub = Math.max(0, context.remainingPicks - 1) * context.poolMinimumRub;
    const riskRub = Math.max(0, minimumReserveRub - projectedRemainingRub);
    const riskRatio = riskRub / context.capRub;
    const expensiveRatio = context.salaryRub / context.capRub;
    const phaseWeight = this.#getPhaseWeight(context.round);
    const coreRelief = this.#getCoreRelief(context.ovr, context.round);
    const depthDiscipline = context.round >= 12 ? Math.max(0, expensiveRatio - 0.035) * 110 : 0;
    return -(riskRatio * 150 * phaseWeight + depthDiscipline) * coreRelief;
  }

  #getPhaseWeight(round) {
    if (round <= 5) return 0.22;
    if (round <= 10) return 0.58;
    if (round <= 16) return 0.92;
    return 1.25;
  }

  #getCoreRelief(ovr, round) {
    if (round <= 5 && ovr >= 80) return 0.25;
    if (round <= 8 && ovr >= 78) return 0.55;
    return 1;
  }
}
