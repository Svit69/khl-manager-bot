import { aiLoanRank } from "./AiLoanRoles.js";
import { LoanMovementReporter } from "./LoanMovementReporter.js";

export class LoanSeasonLifecycle {
  static returnSeason(runtime, season) {
    const records = runtime.service.exportRegistry().filter(row => row.status === "active" && row.season === season);
    return records.map(row => {
      const result = this.returnAgreement(runtime, row, `${Number(season.slice(0, 4)) + 1}-06-01`);
      if (!result.accepted) throw new Error("LOAN_RETURN_FAILED");
      return result;
    });
  }
  static canTerminate(runtime, row, context = runtime.context) {
    const owner = context.teams.find(team => team.id === row.fromTeamId);
    const borrower = context.teams.find(team => team.id === row.toTeamId);
    const player = borrower && [...borrower.getRoster(), ...borrower.juniorPlayers].find(item => item.id === row.playerId);
    if (!player || !owner || ![owner.id, borrower.id].includes(context.activeTeamId)) return false;
    const salaryRub = Number(row.originalContract.salaryRub) || 0;
    const payrollRub = context.contracts.filter(item => item.teamId === owner.id && item.season === context.seasonLabel)
      .reduce((sum, item) => sum + (Number(item.salaryRub) || 0), 0);
    if (context.capEnabled && payrollRub + salaryRub > context.capFor(context.seasonLabel)) return false;
    const targetRank = aiLoanRank(owner, player), currentRank = aiLoanRank(borrower, player);
    const benchRank = player.identity.primaryPosition === "ВРТ" ? 2 : player.identity.primaryPosition === "ЗАЩ" ? 6 : 4;
    return currentRank > benchRank && targetRank < currentRank;
  }
  static terminate(runtime, id) {
    const row = runtime.service.exportRegistry().find(item => item.id === id && item.status === "active");
    if (!row || !runtime.context.enabled || !this.canTerminate(runtime, row))
      return { accepted: false, message: "Досрочное завершение не согласовано: нужны согласие клубов и игрока, свободное место под потолком." };
    return this.returnAgreement(runtime, row, runtime.context.currentDate);
  }
  static returnAgreement(runtime, row, currentDate) {
    const context = runtime.context, fromTeam = context.teams.find(team => team.id === row.fromTeamId);
    const toTeam = context.teams.find(team => team.id === row.toTeamId);
    const player = toTeam && [...toTeam.getRoster(), ...toTeam.juniorPlayers].find(item => item.id === row.playerId);
    const result = runtime.service.returnLoan({ agreementId: row.id, player, fromTeam, toTeam, currentDate }, context);
    if (result.ok) LoanMovementReporter.record(context, result.agreement, true);
    return { ...result, accepted: result.ok, message: result.ok ? "Аренда завершена. Игрок вернулся в запас клуба-владельца." : "Не удалось вернуть игрока из аренды." };
  }
}
