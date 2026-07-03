import { ContractType } from "../contracts/ContractType.js";
import { getFallbackMarketSalaryRub } from "../contracts/FallbackMarketSalary.js";
import { formatNextSeason } from "../contracts/SeasonUtils.js";
import { getJuniorSeasonAge } from "./JuniorEligibility.js";
import { getScoutedPotential } from "./JuniorScouting.js";
const getJuniorIdPrefix = (teamId, seasonLabel) => `junior-${teamId}-${String(seasonLabel || "season-1").replace(/[^0-9A-Za-z]+/g, "-")}-`;
const getCoachTargetCount = (coach) => {
  const rating = Number(coach?.ratings?.playerDevelopment) || 70;
  if (rating >= 86) return 3;
  if (rating >= 78) return 2;
  return 1;
};
const getPotentialScore = (player, seasonLabel) => Number(player?.potential?.potential) || Number(getScoutedPotential(player, seasonLabel)?.high) || Number(player?.ovr) || 0;
const isPromotionWorthyProspect = (player, seasonLabel) => {
  const potential = getPotentialScore(player, seasonLabel);
  const ovr = Number(player?.ovr) || 0;
  const age = getJuniorSeasonAge(player, seasonLabel);
  if (potential >= 84 && ovr >= 60) return true;
  if (potential >= 80 && ovr >= 64 && age >= 18) return true;
  return potential >= 78 && ovr >= 67 && age >= 19;
};
const buildOffer = (player, seasonLabel) => {
  const potential = getPotentialScore(player, seasonLabel) || 60;
  const salaryRub = Math.max(getFallbackMarketSalaryRub(player), 750000 + Math.max(0, (Number(player?.ovr) || 55) - 55) * 75000);
  return { years: potential >= 78 ? 3 : potential >= 68 ? 2 : 1, salaryRub };
};
export class AiJuniorProspectSigningService {
  process({ teams, activeTeamId, seasonLabel, getCoachByTeamId, getContractForSeason, canSubmitOffer, signPlayer }) {
    const nextSeason = formatNextSeason(seasonLabel);
    teams.filter((team) => team.id !== activeTeamId && team.juniorTeam).forEach((team) => {
      const targetCount = getCoachTargetCount(getCoachByTeamId(team.id));
      const signedCount = this.#countSignedProspects(team, seasonLabel, nextSeason, getContractForSeason);
      this.#rankCandidates(team, seasonLabel, nextSeason, getContractForSeason)
        .slice(0, Math.max(0, targetCount - signedCount))
        .forEach((player) => {
          const offer = buildOffer(player, seasonLabel);
          if (canSubmitOffer(team, player, offer)) signPlayer(team, player);
        });
    });
  }
  #countSignedProspects(team, seasonLabel, nextSeason, getContractForSeason) {
    const idPrefix = getJuniorIdPrefix(team.id, seasonLabel);
    return team.getRoster().filter((player) => {
      const contract = getContractForSeason(player?.id, nextSeason);
      return String(player?.id || "").startsWith(idPrefix) && contract?.teamId === team.id && contract.type !== ContractType.THREE_WAY;
    }).length;
  }
  #rankCandidates(team, seasonLabel, nextSeason, getContractForSeason) {
    return [...(team.juniorPlayers || [])].filter((player) => getJuniorSeasonAge(player, seasonLabel) <= 20)
      .filter((player) => {
        const contract = getContractForSeason(player.id, nextSeason);
        return (!contract || contract.type === ContractType.THREE_WAY) && isPromotionWorthyProspect(player, seasonLabel);
      }).sort((left, right) => getPotentialScore(right, seasonLabel) - getPotentialScore(left, seasonLabel)
        || (Number(right.ovr) || 0) - (Number(left.ovr) || 0)
        || getJuniorSeasonAge(left, seasonLabel) - getJuniorSeasonAge(right, seasonLabel));
  }
}
