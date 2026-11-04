import { generateUuid } from "../utils/uuid.js";
import { LoanAgreement } from "./LoanAgreement.js";
import { LoanCalendar } from "./LoanCalendar.js";
import { LoanRosterTransfer } from "./LoanRosterTransfer.js";
import { LoanTransaction } from "./LoanTransaction.js";
export class LoanOperations {
  static create(request, context, eligibility) {
    const { player, fromTeam, toTeam, season, currentDate } = request;
    const contracts = context.contractService.getContractsForPlayer(player.id);
    const originalContract = contracts.find(row => row.season === season);
    const endYear = Math.max(...contracts.filter(row => row.teamId === fromTeam.id)
      .map(row => LoanCalendar.seasonYear(row.season) + 1));
    return new LoanAgreement({ id: generateUuid(), playerId: player.id, fromTeamId: fromTeam.id,
      toTeamId: toTeam.id, season, age: eligibility.age, slot: eligibility.slot, status: "active",
      startedAt: new Date(LoanCalendar.timestamp(currentDate)).toISOString(),
      endDate: LoanCalendar.endDate(LoanCalendar.seasonYear(season)), originalContract: { ...originalContract },
      originalContractEndDate: `${endYear}-05-31`, originalAffiliation: {
        teamId: player.affiliation.teamId, contractId: player.affiliation.contractId,
        acquiredDay: player.affiliation.acquiredDay } });
  }
  static commit(service, request, context, agreement, returning = false) {
    const previous = service.exportRegistry();
    const result = LoanTransaction.run(request, context, () => {
      const { player, fromTeam, toTeam } = request, { contractService } = context;
      LoanRosterTransfer.move(player, returning ? toTeam : fromTeam, returning ? fromTeam : toTeam);
      LoanTransaction.synchronous(contractService.reassignSeasonContract(player.id, agreement.season,
        returning ? fromTeam.id : toTeam.id));
      const contract = contractService.getContractForSeason(player.id, agreement.season);
      if (contract?.teamId !== player.affiliation.teamId || contract.id !== agreement.originalContract.id ||
          contract.salaryRub !== agreement.originalContract.salaryRub) throw new Error("CONTRACT_REASSIGNMENT_FAILED");
      player.affiliation.contractId = returning ? agreement.originalAffiliation.contractId : contract.id;
      if (returning) player.affiliation.acquiredDay = agreement.originalAffiliation.acquiredDay;
      const records = returning ? previous.map(row => row.id === agreement.id ? agreement.toJSON() : row)
        : [...previous, agreement.toJSON()];
      service.importRegistry(records);
      LoanTransaction.synchronous(context.persistRegistry?.(service.exportRegistry()));
      return { ok: true, agreement: agreement.toJSON(), reasons: [] };
    });
    if (!result.ok) service.importRegistry(previous);
    return result;
  }
}
