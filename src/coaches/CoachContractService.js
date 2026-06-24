import { clamp } from "../contracts/SeasonUtils.js";

const average = (values) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
const getTeamRank = (standings, teamId) => (standings || []).findIndex((entry) => entry.teamId === teamId) + 1;
const getRosterStrength = (team) => average((team?.getRoster?.() || []).map((player) => Number(player.ovr) || 65)) || 68;
const getReason = (condition, text) => condition ? text : null;

export class CoachContractService {
  buildOffer(coach, team, context = {}, years = 2) {
    const offerYears = clamp(Math.round(Number(years) || 2), 1, 4);
    const fit = Math.round(Number(context.fit?.teamFit) || 70);
    const rank = getTeamRank(context.standings, team?.id);
    const teamCount = Math.max(1, (context.teams || []).length);
    const strength = getRosterStrength(team);
    const ambition = Number(coach?.ambition) || 65;
    const contenderScore = rank ? ((teamCount + 1 - rank) / teamCount) * 22 : (strength - 66) * 0.9;
    const rebuildPenalty = ambition > 75 && strength < 72 ? (ambition - 75) * 0.45 : 0;
    const styleConflict = fit < 62;
    const interest = clamp(Math.round(
      42 + (fit - 70) * 0.55 + contenderScore + (strength - 72) * 0.55
      + Math.min(10, offerYears * 3) + Math.min(8, Number(coach?.experienceScore) || 0)
      - rebuildPenalty - (styleConflict ? 18 : 0),
    ), 5, 98);
    return {
      years: offerYears,
      interest,
      chance: interest,
      styleFit: fit,
      styleConflict,
      ambition,
      decisionDay: (Number(context.day) || 0) + 3,
      reasons: [
        getReason(styleConflict, "конфликт стиля"),
        getReason(ambition >= 78, "высокая амбициозность"),
        getReason(rank > 0 && rank <= Math.ceil(teamCount / 3), "борьба за верх таблицы"),
        getReason(strength < 70, "риск перестройки состава"),
      ].filter(Boolean),
    };
  }

  chooseBestOffer(coach, offers = []) {
    return [...offers].sort((left, right) =>
      (right.interest - left.interest) || (right.years - left.years))[0] || null;
  }

  shouldRenewAfterPlayoffs(coach, { stage = 0, rank = 0, teamCount = 1 } = {}) {
    const strongSeason = rank > 0 && rank <= Math.ceil(Math.max(1, teamCount) / 3);
    return stage >= 3 || (stage >= 2 && strongSeason) || (stage >= 1 && Number(coach?.overall) >= 82);
  }
}
