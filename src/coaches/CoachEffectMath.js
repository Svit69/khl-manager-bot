import { clamp } from "../contracts/SeasonUtils.js";

const rating = (coach, key) => Number(coach?.ratings?.[key]) || 70;
const above = (value, divisor) => ((Number(value) || 70) - 70) / divisor;

export const buildCoachTeamEffect = (coach, fit, isPlayoff) => {
  const overall = ((Number(coach?.overall) || 72) - 72) / 360;
  const rawTeamFit = Number(fit?.teamFit) || 70;
  const teamFit = (rawTeamFit - 70) / 420;
  const coreFit = ((Number(fit?.coreFit) || 70) - 70) / 560;
  const experience = (Number(coach?.experienceScore) || 0) / 620;
  const conflict = rawTeamFit < 62 ? (62 - rawTeamFit) / 520 : 0;
  const playoff = isPlayoff ? above(rating(coach, "playoffPoise"), 520) + experience : 0;
  return {
    attackMultiplier: clamp(1 + overall + teamFit + coreFit + experience + above(rating(coach, "offense"), 390) + above(rating(coach, "tactics"), 760) - conflict, 0.88, 1.16),
    defenseMultiplier: clamp(1 + overall + teamFit + playoff + above(rating(coach, "defense"), 370) + above(rating(coach, "conditioning"), 760) - conflict, 0.88, 1.17),
    penaltyMultiplier: clamp(1 - above(rating(coach, "discipline"), 190) - teamFit / 1.35 + conflict * 1.8, 0.75, 1.28),
    developmentMultiplier: clamp(1 + experience + above(rating(coach, "playerDevelopment"), 310) + above(rating(coach, "lockerRoom"), 700) + teamFit / 1.7 - conflict, 0.9, 1.18),
  };
};
