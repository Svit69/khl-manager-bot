import { calculateAge } from "../contracts/SeasonUtils.js";

const getRank = (standings, teamId) => (standings || []).findIndex((row) => row.teamId === teamId) + 1;
const getGames = (standings, teamId) => (standings || []).find((row) => row.teamId === teamId)?.gp || 0;

export class CoachDevelopmentService {
  applySeason(coaches, teams, standings, seasonDate) {
    const teamCount = Math.max(1, (teams || []).length);
    return (coaches || []).flatMap((coach) => {
      const rank = coach.teamId ? getRank(standings, coach.teamId) || teamCount : teamCount;
      const games = coach.teamId ? getGames(standings, coach.teamId) : 0;
      const age = calculateAge(coach.birthDate, seasonDate);
      const before = coach.overall;
      const resultBoost = coach.teamId ? (teamCount + 1 - rank) / teamCount : -0.1;
      const experienceBoost = Math.min(0.8, (Number(coach.khlGamesCoached) || 0) / 1200);
      const ageDrag = age >= 67 ? -1.1 : age >= 62 ? -0.45 : 0;
      const delta = Math.max(-2, Math.min(2, Math.round(resultBoost + experienceBoost + ageDrag - 0.35)));
      if (coach.teamId) coach.addSeasonExperience(games);
      if (delta) coach.adjustRatings(delta);
      const after = coach.overall;
      return after === before ? [] : [{ coach, before, after, delta }];
    });
  }
}
