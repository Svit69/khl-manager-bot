import { DraftMarketReserve } from "./DraftMarketReserve.js";
export class DraftBudgetPaceGuard {
  #marketReserve = new DraftMarketReserve();
  selectCandidates(context) {
    const isLowCap = context.enabled && context.capRub <= 700000000;
    const reserved = context.candidates.filter((player) => this.#marketReserve.preservesReserve(player, context));
    const candidates = reserved.length ? reserved : context.candidates;
    if (isLowCap && !reserved.length) return this.#selectLowCapRescueCandidates({ ...context, candidates });
    if (!context.enabled || context.capRub > 700000000) {
      const paced = candidates.filter((player) => this.#preservesBudget(player, context));
      return paced.length ? paced : candidates;
    }
    const paced = candidates.filter((player) => this.#preservesBudget(player, context));
    return paced.length ? paced : this.#selectLowCapRescueCandidates({ ...context, candidates });
  }
  #preservesBudget(player, context) {
    if (!context.enabled) return true;
    if (context.remainingPicks <= 1) return true;
    const pickedAfter = context.pickedCount + 1;
    const progressShare = pickedAfter / this.#getBudgetRounds(context);
    const flexShare = this.#getFlexShare(context.round, context.capRub);
    const allowedPayrollRub = context.capRub * Math.min(1, progressShare + flexShare);
    return context.payrollRub + context.getPlayerSalary(player) <= allowedPayrollRub;
  }
  #getFlexShare(round, capRub) {
    const isLowCap = capRub <= 700000000;
    if (isLowCap && round <= 5) return 0.1;
    if (isLowCap && round <= 10) return 0.055;
    if (isLowCap && round <= 16) return 0.025;
    if (round <= 5) return 0.18;
    if (round <= 10) return 0.1;
    if (round <= 16) return 0.04;
    return 0;
  }
  #getBudgetRounds(context) {
    return context.capRub <= 700000000 ? context.rounds + 2 : context.rounds;
  }
  #selectLowCapRescueCandidates(context) {
    const remainingBudgetRub = Math.max(0, context.capRub - context.payrollRub);
    const salaryLimitRub = context.remainingPicks <= 1 ? remainingBudgetRub : Math.max(1000000, remainingBudgetRub / Math.max(1, context.remainingPicks) * 0.85);
    const rescueCandidates = context.candidates
      .filter((player) => context.getPlayerSalary(player) <= salaryLimitRub)
      .sort(context.compareByOvr)
      .slice(0, 24);
    return rescueCandidates.length ? rescueCandidates : [...context.candidates].sort((left, right) =>
      context.getPlayerSalary(left) - context.getPlayerSalary(right) || context.compareByOvr(left, right)
    ).slice(0, 24);
  }
}
