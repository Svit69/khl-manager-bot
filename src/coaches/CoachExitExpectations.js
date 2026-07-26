import { clamp } from "../contracts/SeasonUtils.js";

const getRecentStages = (coach, count = 3) => (coach?.experience?.seasonLog || [])
  .slice(-count)
  .map((entry) => Number(entry.playoffStage) || 0);
const countDeepRuns = (stages) => stages.filter((stage) => stage >= 3).length;
const countTitles = (stages) => stages.filter((stage) => stage >= 5).length;

export const calculateCoachExpectedPlayoffStage = (coach) => {
  const overall = Number(coach?.overall) || 70;
  const ambition = Number(coach?.ambition) || 65;
  const stages = getRecentStages(coach);
  const base = overall >= 90 ? 4 : overall >= 86 ? 3 : overall >= 82 ? 2 : overall >= 78 ? 1 : 0;
  const historyPressure = countDeepRuns(stages) >= 2 ? 1 : 0;
  const titlePressure = countTitles(stages) ? 1 : 0;
  const legacyPressure = Number(coach?.experience?.championships) >= 2 || Number(coach?.experience?.finals) >= 3 ? 1 : 0;
  const ambitionPressure = ambition >= 84 && overall >= 82 ? 1 : 0;
  return clamp(base + historyPressure + titlePressure + legacyPressure + ambitionPressure, 0, 5);
};

export const calculateCoachSeasonUnderperformance = ({ coach, stage, rank, teamCount }) => {
  const expectedStage = calculateCoachExpectedPlayoffStage(coach);
  const expectedRank = Math.ceil(Math.max(1, teamCount) * (Number(coach?.overall) >= 86 ? 0.32 : 0.45));
  const playoffGap = Math.max(0, expectedStage - (Number(stage) || 0));
  const regularGap = rank > 0 && rank > expectedRank ? Math.min(2, (rank - expectedRank) / 5) : 0;
  return clamp(playoffGap + regularGap, 0, 5);
};

export const calculateCoachDismissalChance = (context) => {
  const gap = calculateCoachSeasonUnderperformance(context);
  if (gap < 1.15) return 0;
  const elitePressure = Number(context.coach?.overall) >= 86 ? 0.04 : 0;
  return clamp(0.07 + gap * 0.075 + elitePressure, 0, 0.42);
};

export const calculateCoachNewChallengeChance = ({ coach, stage, contractEnds }) => {
  if (!contractEnds || Number(coach?.overall) < 82 || Number(stage) < 3) return 0;
  const titleBonus = Number(stage) >= 5 ? 0.08 : 0;
  const ambitionBonus = Math.max(0, (Number(coach?.ambition) || 65) - 78) * 0.004;
  return clamp(0.035 + titleBonus + ambitionBonus, 0, 0.18);
};
