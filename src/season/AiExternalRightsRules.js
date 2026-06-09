import { parseSeasonEnd } from "../contracts/SeasonUtils.js";

const samePositionCount = (team, player) =>
  (team?.getRoster?.() || []).filter((entry) => entry.identity?.primaryPosition === player.identity?.primaryPosition).length;

export const shouldReleaseExternalRights = (player, career) => {
  const potential = Number(player.potential?.potential) || Number(player.ovr) || 0;
  return potential < 76 && (Number(career.returnInterest) || 0) < 28 && (Number(career.seasonsOutsideKhl) || 0) >= 2;
};

export const canSubmitAiExternalOffer = (career, seasonLabel) => {
  if (career.lastKhlOfferSeason === seasonLabel) return false;
  return parseSeasonEnd(career.contractUntil) <= parseSeasonEnd(seasonLabel) && (Number(career.returnInterest) || 0) >= 44;
};

export const findExternalRightsBuyer = (player, teams, rightsTeam, activeTeamId) =>
  (teams || [])
    .filter((team) => team.id !== activeTeamId && team.id !== rightsTeam.id)
    .sort((left, right) => samePositionCount(left, player) - samePositionCount(right, player))[0] || null;

export const shouldTradeExternalRights = (player, career, teams, rightsTeam, activeTeamId) => {
  const potential = Number(player.potential?.potential) || Number(player.ovr) || 0;
  if (potential < 80 || (Number(career.returnInterest) || 0) >= 26) return false;
  return Boolean(findExternalRightsBuyer(player, teams, rightsTeam, activeTeamId));
};
