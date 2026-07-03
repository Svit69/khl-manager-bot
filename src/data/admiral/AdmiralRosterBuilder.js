import { TeamRosterBuilder } from "../roster/TeamRosterBuilder.js";
import { ADMIRAL_TEAM_ID, contractTypeByRussianLabel, khlSeasonLabels, nationalityByRussianLabel, positionByRussianLabel } from "./constants.js";

export class AdmiralRosterBuilder extends TeamRosterBuilder {
  constructor() {
    super({ teamId: ADMIRAL_TEAM_ID, positionByLabel: positionByRussianLabel, nationalityByLabel: nationalityByRussianLabel, contractTypeByLabel: contractTypeByRussianLabel, seasonByIndex: khlSeasonLabels });
  }
  createPlayerId(slug) { return `admiral-player-${slug}`; }
  createContractId(slug, seasonIndex) { return `admiral-contract-${slug}-${seasonIndex}`; }
}
