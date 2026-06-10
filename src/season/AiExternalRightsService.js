import { getFallbackMarketSalaryRub } from "../contracts/FallbackMarketSalary.js";
import { roundSalaryRub } from "../contracts/ContractServiceShared.js";
import {
  canSubmitAiExternalOffer,
  findExternalRightsBuyer,
  shouldReleaseExternalRights,
  shouldTradeExternalRights,
} from "./AiExternalRightsRules.js";

export class AiExternalRightsService {
  process({ players, teams, activeTeamId, seasonLabel, seasonDate, contracts, decisionService, buildContext }) {
    const actions = [];
    (players || []).forEach((player) => {
      const career = player.externalCareer || {};
      const rightsTeam = (teams || []).find((team) => team.id === career.rightsTeamId);
      if (!rightsTeam || rightsTeam.id === activeTeamId) return;
      if (shouldReleaseExternalRights(player, career)) actions.push(this.#release(player, rightsTeam));
      else if (shouldTradeExternalRights(player, career, teams, rightsTeam, activeTeamId)) actions.push(this.#trade(player, teams, rightsTeam, activeTeamId));
      else if (canSubmitAiExternalOffer(career, seasonLabel)) {
        const action = this.#trySign(player, rightsTeam, { seasonLabel, seasonDate, contracts, decisionService, buildContext });
        if (action) actions.push(action);
      }
    });
    return actions.filter(Boolean);
  }

  #trySign(player, team, { seasonLabel, seasonDate, contracts, decisionService, buildContext }) {
    const salaryRub = roundSalaryRub(getFallbackMarketSalaryRub(player) * 1.08);
    const offer = { years: 1, salaryRub };
    const preview = contracts.getFreeAgentPreview(team, player, offer, buildContext(team));
    const decision = decisionService.buildDecision({ player, offer, preview, teamId: team.id, decisionDate: seasonDate, seasonLabel });
    player.externalCareer.lastKhlOfferSeason = seasonLabel;
    if (!decision.accepted) return { type: "offerRejected", player, team };
    contracts.finalizeFreeAgentSigning(team, player, offer, { currentDate: seasonDate, seasonLabel });
    return { type: "signed", player, team };
  }

  #release(player, rightsTeam) {
    player.externalCareer.rightsTeamId = null;
    return { type: "released", player, fromTeam: rightsTeam };
  }

  #trade(player, teams, rightsTeam, activeTeamId) {
    const buyer = findExternalRightsBuyer(player, teams, rightsTeam, activeTeamId);
    player.externalCareer.rightsTeamId = buyer.id;
    return { type: "rightsTrade", player, fromTeam: rightsTeam, toTeam: buyer };
  }
}
