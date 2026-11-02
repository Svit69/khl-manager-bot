import { ExternalTransferFactory } from './ExternalTransferFactory.js';

export class TransferMarketMover {
  #rosterMover; #contractUpdater; #externalFactory = new ExternalTransferFactory();
  constructor(rosterMover, contractUpdater) {
    this.#rosterMover = rosterMover;
    this.#contractUpdater = contractUpdater;
  }
  moveToFreeAgency(context, player) {
    this.#rosterMover.removePlayerFromTeams(context.teams, player.id);
    player.affiliation.teamId = null;
    player.affiliation.contractId = null;
    context.freeAgents.push(player);
    this.#contractUpdater.updateContracts(context.contracts, context.record, null);
  }
  moveToExternalRights(context, player, rightsTeamId) {
    this.#rosterMover.removePlayerFromTeams(context.teams, player.id);
    player.affiliation.teamId = null;
    player.affiliation.contractId = null;
    player.externalCareer = this.#externalFactory.createExternalCareer(context.record, rightsTeamId);
    context.externalPlayers.push(player);
    this.#contractUpdater.updateContracts(context.contracts, context.record, null);
  }
}
