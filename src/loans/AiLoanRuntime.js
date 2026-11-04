import { AiLoanPlanner } from "./AiLoanPlanner.js";
import { LoanExecution } from "./LoanExecution.js";
import { LoanCalendar } from "./LoanCalendar.js";

export class AiLoanRuntime {
  #planner = new AiLoanPlanner();
  #state = null;
  exportState() { return structuredClone(this.#state); }
  importState(state) { this.#state = state && typeof state === "object" ? structuredClone(state) : null; }
  tick(runtime) {
    const context = runtime.context;
    runtime.proposals.expire(context.currentDate, context.seasonLabel);
    if (!context.enabled || !context.activeTeamId || !["regular", "preseason"].includes(context.phase)) return;
    const plan = this.#planner.plan({ teams: context.teams, activeTeamId: context.activeTeamId,
      seasonLabel: context.seasonLabel, currentDate: context.currentDate, planState: this.#state,
      seed: context.careerSeed || `legacy-${context.activeTeamId}`,
      agreements: runtime.service.exportRegistry().filter(row => row.season === context.seasonLabel),
      pending: runtime.proposals.exportProposals().filter(row => row.status === "pending"),
      salaryOf: player => context.contractService.getContractForSeason(player.id, context.seasonLabel)?.salaryRub || 0,
      canLoan: (player, owner, borrower) => runtime.evaluate(player, owner, borrower, context).eligible });
    this.#state = plan.planState;
    const row = plan.candidate;
    if (!row) return;
    const proposal = { id: row.id, playerId: row.playerId, fromTeamId: row.ownerTeamId, toTeamId: row.borrowerTeamId,
      season: context.seasonLabel, expiresAt: new Date(Math.min(new Date(context.currentDate).getTime() + 10 * 86400000,
        LoanCalendar.deadline(LoanCalendar.seasonYear(context.seasonLabel)))).toISOString() };
    if (!row.requiresUserApproval) { LoanExecution.execute(runtime, proposal); return; }
    runtime.proposals.add(proposal);
    const player = context.teams.flatMap(team => team.getRoster()).find(item => item.id === row.playerId);
    context.notify({ id: `notification-${row.id}`, type: "loan", title: "Предложение аренды", message: `${player.name}: клуб предлагает аренду до конца сезона. Решение доступно в контрактах.`,
      playerId: row.playerId, day: context.currentDay, createdAt: new Date().toISOString(), read: false });
  }
}
