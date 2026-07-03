import { TeamRosterBuilder } from "../roster/TeamRosterBuilder.js";
import { AMUR_TEAM_ID, contractTypeByRussianLabel, khlSeasonLabels, nationalityByRussianLabel, positionByRussianLabel } from "./constants.js";

export class AmurRosterBuilder extends TeamRosterBuilder {
  constructor() {
    super({ teamId: AMUR_TEAM_ID, positionByLabel: positionByRussianLabel, nationalityByLabel: nationalityByRussianLabel, contractTypeByLabel: contractTypeByRussianLabel, seasonByIndex: khlSeasonLabels });
  }
  createPlayerId(slug) { return `amur-player-${slug}`; }
  createContractId(slug, seasonIndex) { return `amur-contract-${slug}-${seasonIndex}`; }
}
