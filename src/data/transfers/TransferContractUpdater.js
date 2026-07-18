import { TransferStatus } from "./TransferStatus.js";

export class TransferContractUpdater {
  updateContracts(contracts, record, targetTeamId = null) {
    if (!record?.playerId) return;
    if (record.status === TransferStatus.REMOVED) {
      this.#removePlayerContracts(contracts, record.playerId);
      return;
    }
    contracts
      .filter((contract) => contract.playerId === record.playerId)
      .forEach((contract) => { contract.teamId = targetTeamId; });
  }

  #removePlayerContracts(contracts, playerId) {
    for (let index = contracts.length - 1; index >= 0; index--) {
      if (contracts[index]?.playerId === playerId) contracts.splice(index, 1);
    }
  }
}
