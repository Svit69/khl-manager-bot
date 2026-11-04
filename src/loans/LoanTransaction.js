import { LoanRosterTransfer } from "./LoanRosterTransfer.js";
export class LoanTransaction {
  static synchronous(value) {
    if (value && typeof value.then === "function") throw new Error("ASYNC_CALLBACK_NOT_SUPPORTED");
    return value;
  }
  static run(request, context, action) {
    const { player, fromTeam, toTeam } = request, { contractService } = context;
    const arrays = [...new Set([fromTeam, toTeam].flatMap(team => LoanRosterTransfer.arrays(team)))];
    const rosters = arrays.map(array => [array, [...array]]);
    const { teamId, contractId, acquiredDay } = player.affiliation;
    const contracts = structuredClone(contractService.exportContracts());
    try { return action(); }
    catch (error) {
      rosters.forEach(([array, values]) => array.splice(0, array.length, ...values));
      Object.assign(player.affiliation, { teamId, contractId, acquiredDay });
      contractService.importContracts(contracts);
      return { ok: false, reasons: [error.message || "TRANSACTION_FAILED"] };
    }
  }
}
