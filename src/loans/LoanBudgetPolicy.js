import { AiContractBudgetPolicy } from "../contracts/AiContractBudgetPolicy.js";
import { formatNextSeason } from "../contracts/SeasonUtils.js";
import { LoanFutureBudgetPolicy } from "./LoanFutureBudgetPolicy.js";

export class LoanBudgetPolicy {
  #aiBudget = new AiContractBudgetPolicy();
  #futureBudget = new LoanFutureBudgetPolicy();
  evaluate({ player, fromTeam, toTeam, season, contracts, capFor, activeTeamId, capEnabled, teams = [] }) {
    const current = contracts.find(row => row.playerId === player.id && row.season === season);
    const salaryRub = Number(current?.salaryRub) || 0;
    const payroll = (teamId, label) => contracts.filter(row => row.teamId === teamId && row.season === label)
      .reduce((sum, row) => sum + (Number(row.salaryRub) || 0), 0);
    const capRub = capFor(season), beforeRub = payroll(toTeam.id, season);
    const projectedRub = beforeRub + salaryRub, reasons = [];
    if (capEnabled && projectedRub > capRub) reasons.push("RECEIVER_SALARY_CAP");
    if (capEnabled && toTeam.id !== activeTeamId && !this.#aiBudget.canSubmitOffer({
      team: toTeam, player, offer: { salaryRub }, mode: "loan", capRub, remainingRub: capRub - beforeRub,
    })) reasons.push("RECEIVER_ROSTER_BUDGET");
    const nextSeason = formatNextSeason(season);
    if (capEnabled) reasons.push(...this.#futureBudget.evaluate({ player, fromTeam, season, contracts, capFor, activeTeamId, teams }));
    return { eligible: reasons.length === 0, reasons, salaryRub, capRub, projectedRub,
      remainingRub: capRub - projectedRub, ownerNextSeasonRub: payroll(fromTeam.id, nextSeason) };
  }
}
