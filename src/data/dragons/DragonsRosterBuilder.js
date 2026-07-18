import { TeamRosterBuilder } from "../roster/TeamRosterBuilder.js";
import { DRAGONS_TEAM_ID, contractTypeByRussianLabel, khlSeasonLabels, nationalityByRussianLabel, positionByRussianLabel } from "./constants.js";

export class DragonsRosterBuilder extends TeamRosterBuilder {
  constructor() {
    super({ teamId: DRAGONS_TEAM_ID, positionByLabel: positionByRussianLabel, nationalityByLabel: nationalityByRussianLabel, contractTypeByLabel: contractTypeByRussianLabel, seasonByIndex: khlSeasonLabels });
  }
  createPlayerId(slug) { return `dragons-player-${slug}`; }
  createContractId(slug, seasonIndex) { return `dragons-contract-${slug}-${seasonIndex}`; }
}
