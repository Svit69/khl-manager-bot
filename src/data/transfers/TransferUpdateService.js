import { TransferMarketMover } from "./TransferMarketMover.js";
import { ExternalActiveTransferResolver } from "./ExternalActiveTransferResolver.js";
import { TransferContractUpdater } from "./TransferContractUpdater.js";
import { TransferPlayerAdjuster } from "./TransferPlayerAdjuster.js";
import { TransferRosterMover } from "./TransferRosterMover.js";
import { TransferStatus } from "./TransferStatus.js";
import { FreeAgentActiveTransferResolver } from "./FreeAgentActiveTransferResolver.js";
import { buildTeamIdByShortName, resolveTransferTeamId } from "./TransferTeamIds.js";

export class TransferUpdateService {
  #records;#contractUpdater;#marketMover;#externalResolver;#playerAdjuster;#rosterMover;#freeAgentResolver;
  constructor(records = []) {
    this.#records = [...records];this.#contractUpdater = new TransferContractUpdater();
    this.#externalResolver = new ExternalActiveTransferResolver();
    this.#playerAdjuster = new TransferPlayerAdjuster();
    this.#rosterMover = new TransferRosterMover();this.#freeAgentResolver = new FreeAgentActiveTransferResolver();
    this.#marketMover = new TransferMarketMover(this.#rosterMover, this.#contractUpdater);
  }

  applyTransferUpdates({ teams, freeAgents, externalPlayers, contracts }) {
    const teamIdByShortName = buildTeamIdByShortName(teams);
    this.#records.forEach((record) => this.#applyRecord({ record, teams, freeAgents, externalPlayers, contracts, teamIdByShortName }));
  }
  #applyRecord(context) {
    const found = this.#rosterMover.findPlayer(context.teams, context.record.playerId) ||
      this.#externalResolver.findAndRemoveExternalPlayer(context.record, context.externalPlayers) || this.#freeAgentResolver.findAndRemoveFreeAgent(context.record, context.freeAgents);
    if (!found) return;
    this.#playerAdjuster.applyAdjustments(found.player, context.record);
    const targetTeamId = resolveTransferTeamId(context.teamIdByShortName, context.record.to);
    if (context.record.status === TransferStatus.ACTIVE) this.#moveToActiveTeam(context, found.player, targetTeamId);
    else if (context.record.status === TransferStatus.FREE_AGENT) this.#marketMover.moveToFreeAgency(context, found.player);
    else if ([TransferStatus.EXTERNAL, TransferStatus.RIGHTS_ONLY].includes(context.record.status)) this.#marketMover.moveToExternalRights(context, found.player, targetTeamId);
    else this.#removeFromGame(context, found.player);
  }
  #moveToActiveTeam(context, player, targetTeamId) {
    this.#rosterMover.movePlayerToTeam(context.teams, player, targetTeamId);
    this.#contractUpdater.updateContracts(context.contracts, context.record, targetTeamId);player.affiliation.contractId = context.contracts.find((contract) => contract.playerId === player.id)?.id || player.affiliation.contractId;
  }
  #removeFromGame(context, player) {
    this.#rosterMover.removePlayerFromTeams(context.teams, player.id);
    this.#contractUpdater.updateContracts(context.contracts, context.record, null);
  }
}
