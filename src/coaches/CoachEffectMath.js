import { clamp } from "../contracts/SeasonUtils.js";

const rating = (coach, key) => Number(coach?.ratings?.[key]) || 70;
const compressPositiveCoachEdge = (edge) => {
  if (edge <= 10) return edge;
  return 10 + (edge - 10) * 0.55;
};
const above = (value, divisor) => {
  const edge = (Number(value) || 70) - 70;
  return (edge > 0 ? compressPositiveCoachEdge(edge) : edge) / divisor;
};

export const buildCoachTeamEffect = (coach, fit, isPlayoff) => {
  const overall = above((Number(coach?.overall) || 72) - 2, 420);
  const rawTeamFit = Number(fit?.teamFit) || 70;
  const teamFit = (rawTeamFit - 70) / 420;
  const coreFit = ((Number(fit?.coreFit) || 70) - 70) / 560;
  const experience = (Number(coach?.experienceScore) || 0) / 620;
  const conflict = rawTeamFit < 62 ? (62 - rawTeamFit) / 520 : 0;
  const playoff = isPlayoff ? above(rating(coach, "playoffPoise"), 520) + experience : 0;
  return {
    attackMultiplier: clamp(1 + overall + teamFit + coreFit + experience + above(rating(coach, "offense"), 470) + above(rating(coach, "tactics"), 940) - conflict, 0.93, 1.1),
    defenseMultiplier: clamp(1 + overall + teamFit + playoff + above(rating(coach, "defense"), 450) + above(rating(coach, "conditioning"), 940) - conflict, 0.93, 1.1),
    penaltyMultiplier: clamp(1 - above(rating(coach, "discipline"), 240) - teamFit / 1.55 + conflict * 1.6, 0.82, 1.2),
    developmentMultiplier: clamp(1 + experience + above(rating(coach, "playerDevelopment"), 310) + above(rating(coach, "lockerRoom"), 700) + teamFit / 1.7 - conflict, 0.9, 1.18),
  };
};
