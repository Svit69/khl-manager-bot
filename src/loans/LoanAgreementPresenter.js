import { LoanSeasonLifecycle } from "./LoanSeasonLifecycle.js";

export class LoanAgreementPresenter {
  static present(runtime, row, context = runtime.context) {
    const player = context.teams.flatMap(team => [...team.getRoster(), ...team.juniorPlayers]).find(item => item.id === row.playerId);
    const owner = context.teams.find(team => team.id === row.fromTeamId);
    const borrower = context.teams.find(team => team.id === row.toTeamId);
    const endDate = row.endDate || `${Number(row.season.slice(0, 4)) + 1}-05-31`;
    return { ...row, playerId: row.playerId, displayName: player?.name || "Игрок", photoUrl: player?.identity.photoUrl,
      position: player?.identity.primaryPosition, ovr: player?.ovr, ownerTeamId: owner?.id,
      ownerTeamName: owner?.name, borrowingTeamId: borrower?.id, borrowingTeamName: borrower?.name,
      endDate, returnDate: `${Number(row.season.slice(0, 4)) + 1}-06-01`,
      salaryRub: row.originalContract?.salaryRub || context.contractService.getContractForSeason(row.playerId, row.season)?.salaryRub || 0,
      canTerminate: row.status === "active" && LoanSeasonLifecycle.canTerminate(runtime, row, context),
      terminationReason: "Досрочный возврат требует согласия клубов и игрока и места под потолком владельца." };
  }
}
