import { calculateAge } from "../contracts/SeasonUtils.js";
import { getTeamPlayoffStage } from "./CoachPlayoffStage.js";

const getRank = (standings, teamId) => (standings || []).find((row) => row.teamId === teamId)?.rank || 0;
const getGames = (standings, teamId) => (standings || []).find((row) => row.teamId === teamId)?.gp || 0;
const playoffScore = (stage) => [0, -0.15, 0.15, 0.45, 0.85, 1.25][Math.max(0, Math.min(5, stage))] || 0;

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
    const delta = this.#calculateRatingDelta(coach, { rank, teamCount: context.teamCount, stage, seasonDate: context.seasonDate });
    if (delta) coach.adjustRatings(delta);
    const after = coach.overall;
    return after === before ? [] : [{ coach, before, after, delta }];
  }

  #calculateRatingDelta(coach, { rank, teamCount, stage, seasonDate }) {
    const age = calculateAge(coach.birthDate, seasonDate);
    const regularScore = coach.teamId ? (teamCount + 1 - rank) / teamCount : -0.1;
    const experienceScore = Math.min(0.7, (Number(coach.khlGamesCoached) || 0) / 1400);
    const ageDrag = age >= 67 ? -1.1 : age >= 62 ? -0.45 : 0;
    return Math.max(-2, Math.min(2, Math.round(regularScore + playoffScore(stage) + experienceScore + ageDrag - 0.45)));
  }
}
