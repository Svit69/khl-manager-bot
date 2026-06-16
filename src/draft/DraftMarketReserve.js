export class DraftMarketReserve {
  preservesReserve(player, context) {
    if (!context.enabled || context.remainingPicks <= 1) return true;
    const reserveRub = this.calculateReserveRub(player, context);
    return context.payrollRub + context.getPlayerSalary(player) + reserveRub <= context.capRub;
  }

  calculateReserveRub(player, context) {
    const salaries = context.candidates
      .filter((candidate) => candidate.id !== player.id)
      .map((candidate) => context.getPlayerSalary(candidate))
      .sort((left, right) => left - right);
    const requiredCount = Math.max(0, context.remainingPicks - 1);
    const teamGap = Math.max(1, context.teamCount || 1);
    let reserveRub = 0;
    for (let index = 0; index < requiredCount; index++) {
      reserveRub += salaries[Math.min(salaries.length - 1, index * teamGap)] || 0;
    }
    return reserveRub;
  }
}
