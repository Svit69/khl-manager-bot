import { TeamRosterBuilder } from "../roster/TeamRosterBuilder.js";
import { LADA_TEAM_ID, contractTypeByRussianLabel, khlSeasonLabels, nationalityByRussianLabel, positionByRussianLabel } from "./constants.js";

export class LadaRosterBuilder extends TeamRosterBuilder {
  constructor() {
    super({ teamId: LADA_TEAM_ID, positionByLabel: positionByRussianLabel, nationalityByLabel: nationalityByRussianLabel, contractTypeByLabel: contractTypeByRussianLabel, seasonByIndex: khlSeasonLabels });
  }
  createPlayerId(slug) { return `lada-player-${slug}`; }
  createContractId(slug, seasonIndex) { return `lada-contract-${slug}-${seasonIndex}`; }
}
