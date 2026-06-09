import {
  EXTERNAL_TEAM_IDS,
  nationalityByRussianLabel,
  positionByRussianLabel,
  seasonByContractEndYear,
} from "./constants.js";
import { ExternalRightsProfileBuilder } from "./ExternalRightsProfileBuilder.js";

export class KhlExternalRightsBuilder extends ExternalRightsProfileBuilder {
  constructor() {
    super({
      positionByLabel: positionByRussianLabel,
      nationalityByLabel: nationalityByRussianLabel,
      teamIds: EXTERNAL_TEAM_IDS,
      seasonByEndYear: seasonByContractEndYear,
    });
  }
  createPlayerId(slug) { return `external-rights-${slug}`; }
}
