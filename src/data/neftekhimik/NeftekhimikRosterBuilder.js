import { TeamRosterBuilder } from "../roster/TeamRosterBuilder.js";
import {
  NEFTEKHIMIK_TEAM_ID,
  contractTypeByRussianLabel,
  khlSeasonLabels,
  nationalityByRussianLabel,
  positionByRussianLabel,
} from "./constants.js";

export class NeftekhimikRosterBuilder extends TeamRosterBuilder {
  constructor() {
    super({
      teamId: NEFTEKHIMIK_TEAM_ID,
      positionByLabel: positionByRussianLabel,
      nationalityByLabel: nationalityByRussianLabel,
      contractTypeByLabel: contractTypeByRussianLabel,
      seasonByIndex: khlSeasonLabels,
    });
  }
  createPlayerId(slug) { return `neftekhimik-player-${slug}`; }
  createContractId(slug, seasonIndex) { return `neftekhimik-contract-${slug}-${seasonIndex}`; }
}
