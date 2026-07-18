import { ExternalTransferFactory } from "./ExternalTransferFactory.js";
import { TransferContractUpdater } from "./TransferContractUpdater.js";
import { TransferPlayerAdjuster } from "./TransferPlayerAdjuster.js";
import { TransferRosterMover } from "./TransferRosterMover.js";
import { TransferStatus } from "./TransferStatus.js";
import { buildTeamIdByShortName, resolveTransferTeamId } from "./TransferTeamIds.js";

export class TransferUpdateService {
  #records;#contractUpdater;#externalFactory;#playerAdjuster;#rosterMover;
  constructor(records = []) {
    this.#records = [...records];this.#contractUpdater = new TransferContractUpdater();
    this.#externalFactory = new ExternalTransferFactory();this.#playerAdjuster = new TransferPlayerAdjuster();
    this.#rosterMover = new TransferRosterMover();
  }

  applyTransferUpdates({ teams, freeAgents, externalPlayers, contracts }) {
    const teamIdByShortName = buildTeamIdByShortName(teams);
    this.#records.forEach((record) => this.#applyRecord({ record, teams, freeAgents, externalPlayers, contracts, teamIdByShortName }));
  }
  #applyRecord(context) {
    const found = this.#rosterMover.findPlayer(context.teams, context.record.playerId);
    if (!found) return;
    this.#playerAdjuster.applyAdjustments(found.player, context.record);
    const targetTeamId = resolveTransferTeamId(context.teamIdByShortName, context.record.to);
    if (context.record.status === TransferStatus.ACTIVE) this.#moveToActiveTeam(context, found.player, targetTeamId);
    else if (context.record.status === TransferStatus.FREE_AGENT) this.#moveToFreeAgency(context, found.player);
    else if ([TransferStatus.EXTERNAL, TransferStatus.RIGHTS_ONLY].includes(context.record.status)) this.#moveToExternalRights(context, found.player, targetTeamId);
    else this.#removeFromGame(context, found.player);
  }
  #moveToActiveTeam(context, player, targetTeamId) {
    this.#rosterMover.movePlayerToTeam(context.teams, player, targetTeamId);
    this.#contractUpdater.updateContracts(context.contracts, context.record, targetTeamId);
  }
  #moveToFreeAgency(context, player) {
    this.#rosterMover.removePlayerFromTeams(context.teams, player.id);
    player.affiliation.teamId = null;player.affiliation.contractId = null;
    context.freeAgents.push(player);this.#contractUpdater.updateContracts(context.contracts, context.record, null);
  }
  #moveToExternalRights(context, player, rightsTeamId) {
    this.#rosterMover.removePlayerFromTeams(context.teams, player.id);
    player.affiliation.teamId = null;player.affiliation.contractId = null;
    player.externalCareer = this.#externalFactory.createExternalCareer(context.record, rightsTeamId);
    context.externalPlayers.push(player);this.#contractUpdater.updateContracts(context.contracts, context.record, null);
  }
  #removeFromGame(context, player) {
    this.#rosterMover.removePlayerFromTeams(context.teams, player.id);
    this.#contractUpdater.updateContracts(context.contracts, context.record, null);
  }
}
