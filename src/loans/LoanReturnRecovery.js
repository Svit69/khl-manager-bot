import { LoanRosterTransfer } from "./LoanRosterTransfer.js";

export class LoanReturnRecovery {
  static prepare(request, context, agreement) {
    const { player, fromTeam, toTeam } = request;
    const teamIds = new Set([fromTeam.id, toTeam.id]);
    if (player.affiliation.teamId && !teamIds.has(player.affiliation.teamId))
      throw new Error("CONFLICTING_LOAN_OWNER");
    if ((context.teams || []).some(team => !teamIds.has(team.id) &&
      LoanRosterTransfer.arrays(team).flat().some(item => item?.id === player.id)))
      throw new Error("CONFLICTING_LOAN_ROSTER");
    const current = context.contractService.getContractForSeason(player.id, agreement.season);
    if (current?.teamId && !teamIds.has(current.teamId)) throw new Error("CONFLICTING_LOAN_CONTRACT");
    for (const team of [fromTeam, toTeam]) {
      for (const array of LoanRosterTransfer.arrays(team)) {
        for (let index = array.length - 1; index >= 0; index--) {
          if (array[index]?.id !== player.id) continue;
          if (team.lines.some(line => line.players === array)) array[index] = null;
          else array.splice(index, 1);
        }
      }
    }
    toTeam.reservePlayers.push(player);
    player.affiliation.teamId = toTeam.id;
    context.contractService.restoreLoanSeasonContract(agreement.originalContract);
  }
}
