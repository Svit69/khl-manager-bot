import { calculateCoachDismissalChance, calculateCoachNewChallengeChance } from "./CoachExitExpectations.js";
import { getTeamPlayoffStage } from "./CoachPlayoffStage.js";

const getContractEndYear = (coach) => Number(String(coach?.contractUntil || "").slice(0, 4)) || 0;
const getTeamRank = (standings, teamId) => (standings || []).findIndex((entry) => entry.teamId === teamId) + 1;

export class CoachExitService {
  processOffseasonDepartures({ coaches, archive, teamCount, seasonEnd, random = Math.random }) {
    const standings = archive?.standings || [];
    return (coaches || [])
      .filter((coach) => coach.teamId)
      .map((coach) => this.#buildCoachDeparture(coach, { archive, standings, teamCount, seasonEnd, random }))
      .filter(Boolean);
  }

  #buildCoachDeparture(coach, context) {
    const teamId = coach.teamId;
    const stage = getTeamPlayoffStage(context.archive?.playoffs, teamId);
    const rank = getTeamRank(context.standings, teamId);
    const contractEnds = getContractEndYear(coach) <= context.seasonEnd;
    const dismissalChance = calculateCoachDismissalChance({ coach, stage, rank, teamCount: context.teamCount });
    if (dismissalChance > 0 && context.random() < dismissalChance) {
      return { coach, teamId, reason: "belowExpectations", stage, rank, chance: dismissalChance };
    }
    const challengeChance = calculateCoachNewChallengeChance({ coach, stage, contractEnds });
    if (challengeChance > 0 && context.random() < challengeChance) {
      return { coach, teamId, reason: "newChallenge", stage, rank, chance: challengeChance };
    }
    return null;
  }
}
