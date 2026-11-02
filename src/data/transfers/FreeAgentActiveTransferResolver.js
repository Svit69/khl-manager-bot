import { TransferStatus } from './TransferStatus.js';

export class FreeAgentActiveTransferResolver {
  findAndRemoveFreeAgent(record, freeAgents = []) {
    if (record.status !== TransferStatus.ACTIVE) return null;
    const index = freeAgents.findIndex(player => player.id === record.playerId);
    if (index < 0) return null;
    const [player] = freeAgents.splice(index, 1);
    return { player };
  }
}
