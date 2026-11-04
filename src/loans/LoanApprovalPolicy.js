import { isAiLoanSurplus, aiLoanRoleImprovement } from "./AiLoanRoles.js";
import { LoanBudgetPolicy } from "./LoanBudgetPolicy.js";
import { LoanReasonPresenter } from "./LoanReasonPresenter.js";

export class LoanApprovalPolicy {
  #budget = new LoanBudgetPolicy();
  evaluate(service, context, player, fromTeam, toTeam) {
    if (!player || !fromTeam || !toTeam) return { eligible: false, reasons: ["Выберите игрока и клуб."], codes: ["INVALID_PARTICIPANTS"] };
    const request = { player, fromTeam, toTeam, season: context.seasonLabel, currentDate: context.currentDate, consent: true };
    const result = service.evaluate(request, context), codes = [...result.reasons];
    if (!context.enabled) codes.push("DISABLED");
    if (!result.eligible) return { ...result, codes, reasons: LoanReasonPresenter.describe(codes) };
    if (fromTeam.id !== context.activeTeamId && !isAiLoanSurplus(fromTeam, player, context.currentDate)) codes.push("OWNER_REFUSES");
    if (!aiLoanRoleImprovement(fromTeam, toTeam, player)) codes.push("PLAYER_REFUSES");
    const budget = this.#budget.evaluate({ ...context, player, fromTeam, toTeam, season: context.seasonLabel });
    codes.push(...budget.reasons);
    return { ...result, ...budget, eligible: codes.length === 0, codes, reasons: LoanReasonPresenter.describe(codes) };
  }
}
