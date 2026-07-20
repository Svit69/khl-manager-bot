import { clamp } from "../contracts/SeasonUtils.js";

export const getGoalieSavePercentage = (seasonStats) =>
  Number(seasonStats?.savePercentage) || 0;

export const getGoalieGoalsAgainstAverage = (seasonStats) => {
  const games = Math.max(1, Number(seasonStats?.games) || 0);
  return (Number(seasonStats?.goalsAgainst) || 0) / games;
};

export const getGoalieQualityStartRate = (seasonStats) => {
  const games = Math.max(1, Number(seasonStats?.games) || 0);
  return (Number(seasonStats?.qualityStarts) || 0) / games;
};

export const getExpectedGoalieSavePercentage = (player) =>
  clamp(0.884 + ((Number(player?.ovr) || 72) - 68) * 0.0024, 0.875, 0.928);

export const getGoalieUsageDevelopmentComponent = ({ age, games, teamGamesPlayed }) => {
  const startShare = games / Math.max(1, teamGamesPlayed);
  let delta = 0;
  if (startShare >= 0.68) delta += 0.044;
  else if (startShare >= 0.48) delta += 0.032;
  else if (startShare >= 0.28) delta += 0.014;
  else if (games >= 5) delta += 0.004;
  if (age <= 23 && startShare >= 0.35) delta += 0.018;
  if (age <= 23 && startShare < 0.2 && games >= 8) delta -= 0.018;
  return clamp(delta, -0.026, 0.064);
};

export const getGoaliePerformanceDevelopmentComponent = ({ player, seasonStats, games }) => {
  const savePercentage = getGoalieSavePercentage(seasonStats);
  const expectedSavePercentage = getExpectedGoalieSavePercentage(player);
  const goalsAgainstAverage = getGoalieGoalsAgainstAverage(seasonStats);
  const qualityStartRate = getGoalieQualityStartRate(seasonStats);
  const sampleFactor = clamp(games / 18, 0.35, 1);
  let delta = (savePercentage - expectedSavePercentage) * 2.4;
  delta += (2.75 - goalsAgainstAverage) * 0.018;
  delta += (qualityStartRate - 0.42) * 0.1;
  if (savePercentage >= 0.922 && games >= 10) delta += 0.022;
  if (savePercentage <= 0.885 && games >= 12) delta -= 0.026;
  return clamp(delta * sampleFactor, -0.092, 0.128);
};
