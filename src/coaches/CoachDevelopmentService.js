import { applyCoachRatingGrowth, calculateCoachRatingGrowth } from "./CoachRatingGrowth.js";
import { getTeamPlayoffStage } from "./CoachPlayoffStage.js";

const getRank = (standings, teamId) => (standings || []).find((row) => row.teamId === teamId)?.rank || 0;
const getGames = (standings, teamId) => (standings || []).find((row) => row.teamId === teamId)?.gp || 0;

export class CoachDevelopmentService {
  applySeason(coaches, teams, archive, seasonDate) {
    const standings = archive?.standings || [];
    const teamCount = Math.max(1, (teams || []).length);
    return (coaches || []).flatMap((coach) => this.#applyCoachSeason(coach, { archive, standings, teamCount, seasonDate }));
  }

  #applyCoachSeason(coach, context) {
    const teamId = coach.teamId;
    const rank = teamId ? getRank(context.standings, teamId) || context.teamCount : context.teamCount;
    const games = teamId ? getGames(context.standings, teamId) : 0;
    const stage = getTeamPlayoffStage(context.archive?.playoffs, teamId);
    const before = coach.overall;
    if (teamId) coach.addSeasonExperience(games, { seasonLabel: context.archive?.seasonLabel, teamId, playoffStage: stage });
    const changes = calculateCoachRatingGrowth(coach, { rank, teamCount: context.teamCount, stage, seasonDate: context.seasonDate });
    applyCoachRatingGrowth(coach, changes);
    const after = coach.overall;
    return after === before ? [] : [{ coach, before, after, changes }];
  }
}
