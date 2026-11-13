import { LoanRosterTransfer } from "./LoanRosterTransfer.js";
import { LoanMovementReporter } from "./LoanMovementReporter.js";

export class LoanSeasonReturnBatch {
  static run(runtime, records, returnAgreement) {
    if (!records.length) return [];
    const context = runtime.context;
    const arrays = [...new Set(context.teams.flatMap(team => LoanRosterTransfer.arrays(team)))];
    const rosters = arrays.map(array => [array, [...array]]);
    const players = [...new Set([...arrays.flat(), ...(context.getAllPlayers?.() || [])].filter(Boolean))];
    const affiliations = players.filter(player => player.affiliation).map(player => [player, {
      teamId: player.affiliation.teamId, contractId: player.affiliation.contractId, acquiredDay: player.affiliation.acquiredDay }]);
    const contracts = structuredClone(context.contractService.exportContracts());
    const registry = runtime.service.exportRegistry();
    let results;
    try {
      results = records.map(row => {
        const result = returnAgreement(row);
        if (!result.accepted) {
          const error = new Error(`LOAN_RETURN_FAILED: ${row.playerId}: ${(result.reasons || []).join(", ")}`);
          error.playerId = row.playerId;
          error.reasons = result.reasons || [];
          throw error;
        }
        return result;
      });
    } catch (error) {
      rosters.forEach(([array, values]) => array.splice(0, array.length, ...values));
      affiliations.forEach(([player, affiliation]) => Object.assign(player.affiliation, affiliation));
      context.contractService.importContracts(contracts, { mergeBaseContracts: false });
      runtime.service.importRegistry(registry);
      throw error;
    }
    results.forEach(result => LoanMovementReporter.record(context, result.agreement, true));
    return results;
  }
}
