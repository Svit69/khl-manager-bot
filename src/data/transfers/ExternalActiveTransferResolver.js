import { TransferStatus } from "./TransferStatus.js";

export class ExternalActiveTransferResolver {
  findAndRemoveExternalPlayer(record, externalPlayers = []) {
    if (record?.status !== TransferStatus.ACTIVE) return null;
    const playerIndex = externalPlayers.findIndex((player) => player?.id === record.playerId);
    if (playerIndex < 0) return null;
    const [player] = externalPlayers.splice(playerIndex, 1);
    delete player.externalCareer;
    return { player };
  }
}
