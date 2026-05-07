import { calculateAge, clamp } from "../contracts/SeasonUtils.js";
import { isForwardPosition } from "./PlayerDevelopmentShared.js";

export const getExpectedProduction = (player) => {
  const ovr = Number(player.ovr) || 70;
  if (isForwardPosition(player.identity?.primaryPosition)) {
    return {
      pointsPerGame: clamp(((ovr - 55) / 45) * 0.8, 0.12, 0.95),
      shotsPerGame: clamp(((ovr - 55) / 45) * 3, 0.6, 3.5),
    };
  }
  return {
    pointsPerGame: clamp(((ovr - 55) / 50) * 0.45, 0.08, 0.55),
    shotsPerGame: clamp(((ovr - 55) / 45) * 1.8, 0.4, 2.4),
  };
};

export const getPlayerVolatility = (player, age) => {
  const seedSource = `${player.id || player.name || ""}`;
  let hash = 0;
  for (let index = 0; index < seedSource.length; index++) {
    hash = ((hash * 31) + seedSource.charCodeAt(index)) % 9973;
  }
  const normalized = (hash % 1000) / 1000;
  let amplitude = age <= 19 ? 0.16 : age <= 22 ? 0.11 : 0.06;
  amplitude += Math.max(0, (Number(player.potential?.growthRate) || 0.3) - 0.3) * 0.08;
  return 1 + (normalized - 0.5) * amplitude * 2;
};

export const getAgeDevelopmentComponent = (player, age) => {
  const growthRate = Number(player.potential?.growthRate) || 1;
  const declineRate = Number(player.potential?.declineRate) || 1;
  const peakAge = Number(player.potential?.peakAge) || 27;

  if (age <= 18) return 0.086 * growthRate;
  if (age <= 20) return 0.069 * growthRate;
  if (age <= 23) return 0.046 * growthRate;
  if (age < peakAge) return 0.021 * growthRate;
  if (age === peakAge) return 0.002;
  if (age === peakAge + 1) return -0.011 * declineRate;
  if (age <= peakAge + 3) return -0.026 * declineRate;
  if (age <= peakAge + 6) {
    const yearsPast = age - peakAge - 3;
    return -0.04 * declineRate * (1 + yearsPast * 0.18);
  }
  const lateYearsPast = age - peakAge - 6;
  return -0.058 * declineRate * (1 + Math.min(1.1, lateYearsPast * 0.2));
};

export const getUsageDevelopmentComponent = (player, age, games, avgIceTime, matchStat, context) => {
  const teamGamesPlayed = Math.max(games, Number(context?.teamGamesPlayed) || 0);
  let delta = 0;
  if (matchStat) delta += 0.012;
  if (avgIceTime >= 18) delta += 0.05;
  else if (avgIceTime >= 14) delta += 0.035;
  else if (avgIceTime >= 10) delta += 0.02;
  else if (avgIceTime >= 6) delta += 0.005;
  else delta -= 0.025;

  if (teamGamesPlayed >= 12 && games >= teamGamesPlayed * 0.6) delta += 0.014;
  if (!matchStat && games >= 10 && avgIceTime < 7) delta -= 0.015;
  if (age <= 23) delta += getYoungPlayerUsageBoost(player, age, games, avgIceTime, teamGamesPlayed);
  delta += getQualityOfMinutesBoost(player, age, avgIceTime, matchStat);
  delta += getYoungDefenseTopFourBoost(player, age, avgIceTime);
  delta += getVeteranUsageRetention(player, age, avgIceTime, games, teamGamesPlayed);

  return delta * 1.15;
};

export const getPerformanceDevelopmentComponent = (
  player,
  age,
  pointsPerGame,
  shotsPerGame,
  expected,
  avgIceTime,
  volatility,
  games,
) => {
  const ppgGap = pointsPerGame - expected.pointsPerGame;
  const shotsGap = shotsPerGame - expected.shotsPerGame;
  const isForward = isForwardPosition(player.identity?.primaryPosition);
  let delta = isForward
    ? ppgGap * 0.22 + shotsGap * 0.06
    : ppgGap * 0.12 + shotsGap * 0.025 + getDefensePerformanceSignal(player, avgIceTime);

  if (age <= 21) {
    if (delta > 0) delta *= 1.28 + (volatility - 1) * 0.6;
    else delta *= 0.8 + Math.max(0, 1 - volatility) * 0.4;
    if (pointsPerGame >= expected.pointsPerGame * 0.95) {
      delta += 0.01 * (Number(player.potential?.growthRate) || 1);
    }
  } else if (age <= 23 && delta > 0) {
    delta *= 1.12 + Math.max(0, volatility - 1) * 0.35;
  } else if (delta > 0) {
    delta *= 0.98 + Math.max(0, volatility - 1) * 0.2;
  }

  if (delta < 0) {
    const isLongSample = games >= 18 && avgIceTime >= 9;
    delta *= isLongSample ? 0.9 : 0.55;
    if (isForward && games >= 20 && avgIceTime >= 11 && shotsPerGame <= expected.shotsPerGame * 0.72) {
      delta -= 0.012;
    }
    if (age >= 31) {
      delta *= avgIceTime >= 15 ? 1.06 : 1.2;
      if (pointsPerGame < expected.pointsPerGame * 0.75) delta -= 0.01;
    }
  }

  return clamp(delta * 1.15, -0.069, 0.126);
};

export const getPotentialGapComponent = (potentialGap) => {
  if (potentialGap >= 8) return 0.03;
  if (potentialGap >= 4) return 0.02;
  if (potentialGap >= 1) return 0.01;
  if (potentialGap <= -2) return -0.02;
  return 0;
};

export const getPeakAgeRealizationComponent = (
  player,
  age,
  potentialGap,
  games,
  avgIceTime,
  pointsPerGame,
  shotsPerGame,
  expected,
) => {
  const peakAge = Number(player.potential?.peakAge) || 27;
  if (potentialGap <= 0 || games < 12 || avgIceTime < 10 || age < peakAge - 3 || age > peakAge + 1) return 0;

  const growthRate = Number(player.potential?.growthRate) || 1;
  const distance = Math.abs(age - peakAge);
  const proximityBonus = distance === 0 ? 0.026 : distance === 1 ? 0.02 : distance === 2 ? 0.013 : 0.007;
  const usageFactor = clamp((avgIceTime - 10) / 10, 0, 1);
  const productionSignal = clamp(
    Math.max(0, pointsPerGame - expected.pointsPerGame) * 0.08 +
      Math.max(0, shotsPerGame - expected.shotsPerGame) * 0.015,
    0,
    0.025,
  );
  const gapFactor = clamp(potentialGap / 6, 0.2, 1);
  return clamp((proximityBonus + productionSignal) * growthRate * (0.55 + usageFactor * 0.45) * gapFactor, 0, 0.04);
};

export const getPotentialDevelopmentDelta = (
  player,
  age,
  games,
  avgIceTime,
  pointsPerGame,
  shotsPerGame,
  expected,
  matchStat,
) => {
  if (age > 24 || !matchStat) return 0;
  const isYoungCore = age <= 21;
  const lineIndex = Number(player.expectedLineIndex) || null;
  if (games < (isYoungCore ? 8 : 12) || avgIceTime < (isYoungCore ? 9 : 10)) return 0;

  const pointsGap = Math.max(0, pointsPerGame - expected.pointsPerGame);
  const shotsGap = Math.max(0, shotsPerGame - expected.shotsPerGame);
  const usageSignal = isYoungCore ? clamp((avgIceTime - 12) * 0.004 + Math.max(0, games - 10) * 0.0015, 0, 0.04) : 0;
  const breakoutSignal = clamp(pointsGap * 0.12 + shotsGap * 0.025 + usageSignal, 0, 0.14);
  if (breakoutSignal <= (isYoungCore ? 0.008 : 0.015)) return 0;

  let delta = breakoutSignal + 0.01;
  if (age <= 21 && avgIceTime >= 14) delta += 0.015;
  if (age <= 20 && avgIceTime >= 17) delta += 0.015;
  if (age <= 20 && lineIndex) {
    delta += lineIndex === 1 ? 0.018 : lineIndex === 2 ? 0.012 : 0.007;
  }
  if ((player.potential?.potential || 0) - player.ovr <= 2) delta += 0.01;
  delta *= Number(player.potential?.growthRate) || 1;
  return clamp(delta, 0, isYoungCore ? 0.16 : 0.12);
};

export const getReserveInactivityRegression = (player, age, games, avgIceTime, teamGamesPlayed) => {
  if (teamGamesPlayed < 12) return { development: 0, potential: 0 };

  const participationRate = games / Math.max(1, teamGamesPlayed);
  let development = 0;
  let potential = 0;

  if (participationRate < 0.5 && avgIceTime < 9) {
    development -= age >= 28 ? 0.018 : age >= 24 ? 0.011 : 0.006;
  }
  if (participationRate < 0.35 && avgIceTime < 7) {
    development -= age >= 30 ? 0.022 : age >= 25 ? 0.014 : 0.008;
  }
  if (age <= 23 && participationRate < 0.42 && avgIceTime < 8) {
    potential -= age <= 20 ? 0.03 : 0.018;
  }
  if (age <= 21 && participationRate < 0.28 && teamGamesPlayed >= 20) {
    potential -= 0.022;
  }

  return {
    development: clamp(development, -0.05, 0),
    potential: clamp(potential, -0.065, 0),
  };
};

export const getRoleRegressionComponent = (player, age, games, avgIceTime) => {
  if (games < 15) return 0;
  const lineIndex = Number(player.expectedLineIndex) || null;
  if (!lineIndex) return age >= 26 ? -0.02 : -0.01;
  if (lineIndex === 4 && avgIceTime < 9) {
    if ((player.ovr || 0) >= 79 || age >= 28) return -0.02;
    return -0.01;
  }
  if (lineIndex === 3 && avgIceTime < 11 && ((player.ovr || 0) >= 81 || age >= 30)) {
    return -0.012;
  }
  return 0;
};

export const getRehabilitationComponent = (player, matchStat, avgIceTime) => {
  if (!matchStat || (player.potential?.developmentProgress || 0) >= 0) return 0;
  const matchMinutes = (Number(matchStat.totalIceTime) || 0) / 60;
  if (matchMinutes >= 18) return 0.016;
  if (matchMinutes >= 14) return 0.01;
  if (avgIceTime >= 12 && matchMinutes >= 10) return 0.006;
  return 0;
};

export const getFreeAgentGraceGames = (age) => {
  if (age <= 20) return 16;
  if (age <= 24) return 13;
  if (age <= 28) return 10;
  return 8;
};

export const getFreeAgentAgeDrivenRegression = (player, age, inactivityPressure) => {
  const declineRate = Number(player.potential?.declineRate) || 0.3;
  const growthRate = Number(player.potential?.growthRate) || 0.3;
  let delta = 0;

  if (age <= 20) delta = -0.004 - inactivityPressure * 0.0007;
  else if (age <= 24) delta = -0.011 - inactivityPressure * 0.0015;
  else if (age <= 28) delta = -0.022 - inactivityPressure * 0.0025;
  else if (age <= 31) delta = -0.033 - inactivityPressure * 0.0038;
  else if (age <= 34) delta = -0.047 - inactivityPressure * 0.0052;
  else delta = -0.061 - inactivityPressure * 0.0068;

  if (age <= 22) delta *= Math.max(0.7, 1 - growthRate * 0.2);
  if (age >= 29) delta *= 1 + declineRate * 0.72;

  return clamp(delta, -0.11, 0);
};

export const getFreeAgentPotentialDecay = (player, age, inactivityPressure) => {
  const growthRate = Number(player.potential?.growthRate) || 0.3;
  let delta = 0;

  if (age <= 19) delta = -0.028 - inactivityPressure * 0.0032;
  else if (age <= 22) delta = -0.021 - inactivityPressure * 0.0024;
  else if (age <= 25) delta = -0.012 - inactivityPressure * 0.0015;
  else delta = -0.004 - inactivityPressure * 0.0006;

  delta *= Math.max(0.85, Math.min(1.25, 1 + (growthRate - 0.3) * 0.45));
  return clamp(delta, -0.12, 0);
};

const getYoungPlayerUsageBoost = (player, age, games, avgIceTime, teamGamesPlayed) => {
  const growthRate = Number(player.potential?.growthRate) || 1;
  const lineIndex = Number(player.expectedLineIndex) || null;
  let delta = 0;

  if (avgIceTime >= 20) delta += 0.04;
  else if (avgIceTime >= 17) delta += 0.03;
  else if (avgIceTime >= 14) delta += 0.022;
  else if (avgIceTime >= 11) delta += 0.012;

  if (teamGamesPlayed >= 10 && games >= teamGamesPlayed * 0.75) delta += 0.016;
  if (teamGamesPlayed >= 16 && games >= teamGamesPlayed * 0.85) delta += 0.01;
  if (age <= 20 && lineIndex) {
    delta += lineIndex === 1 ? 0.022 : lineIndex === 2 ? 0.016 : lineIndex === 3 ? 0.01 : 0.005;
    if (avgIceTime >= 15) delta += 0.01;
  }
  if (age <= 18) delta *= 1.3;
  else if (age <= 20) delta *= lineIndex ? 1.34 : 1.18;
  else if (age <= 22) delta *= 1.08;
  if (age <= 19 && avgIceTime >= 16) delta += 0.016;
  if (age <= 20 && avgIceTime >= 18) delta += 0.01;

  return delta * Math.max(0.85, Math.min(1.3, growthRate));
};

const getQualityOfMinutesBoost = (player, age, avgIceTime, matchStat) => {
  const lineIndex = Number(player.expectedLineIndex) || null;
  let delta = 0;
  if (lineIndex === 1) delta += 0.012;
  else if (lineIndex === 2) delta += 0.007;
  else if (lineIndex === 3) delta += 0.003;
  else if (lineIndex === 4) delta -= 0.004;

  if (age <= 22 && avgIceTime >= 15 && lineIndex && lineIndex <= 2) delta += 0.008;
  if (age <= 20 && avgIceTime >= 17 && lineIndex === 1) delta += 0.01;

  const matchMinutes = (Number(matchStat?.totalIceTime) || 0) / 60;
  if (age <= 21 && matchMinutes >= 18) delta += 0.008;
  else if (age <= 21 && matchMinutes >= 14) delta += 0.004;

  return delta;
};

const getYoungDefenseTopFourBoost = (player, age, avgIceTime) => {
  if (isForwardPosition(player.identity?.primaryPosition) || player.identity?.isGoalie || age > 23) return 0;

  const lineIndex = Number(player.expectedLineIndex) || null;
  let delta = 0;

  if (lineIndex === 1 || lineIndex === 2) delta += 0.008;
  if (avgIceTime >= 22) delta += 0.018;
  else if (avgIceTime >= 19) delta += 0.012;
  else if (avgIceTime >= 16) delta += 0.006;

  if (age <= 20 && lineIndex && lineIndex <= 2) delta += 0.008;
  else if (age <= 22 && lineIndex && lineIndex <= 2) delta += 0.004;
  if (age <= 20 && lineIndex === 1) delta += 0.012;
  else if (age <= 20 && lineIndex === 2) delta += 0.008;
  if (age <= 20 && avgIceTime >= 20) delta += 0.01;
  else if (age <= 20 && avgIceTime >= 17) delta += 0.006;

  return clamp(delta, 0, 0.045);
};

const getVeteranUsageRetention = (player, age, avgIceTime, games, teamGamesPlayed) => {
  if (age < 31) return 0;

  let delta = 0;
  const participationRate = teamGamesPlayed > 0 ? games / teamGamesPlayed : 0;

  if (avgIceTime >= 18) delta += 0.014;
  else if (avgIceTime >= 15) delta += 0.008;
  else if (avgIceTime < 12) delta -= 0.014;

  if (participationRate < 0.62) delta -= 0.008;
  if (participationRate < 0.45 && avgIceTime < 11) delta -= 0.012;

  if (age >= 34 && avgIceTime < 14) delta -= 0.012;
  if (!isForwardPosition(player.identity?.primaryPosition) && avgIceTime >= 19) delta += 0.004;

  return clamp(delta, -0.032, 0.018);
};

const getDefensePerformanceSignal = (player, avgIceTime) => {
  const attrs = player.attributes?.attributesJson || {};
  const defense = Number(attrs.defense) || 0;
  const physical = Number(attrs.physical) || 0;
  const lineIndex = Number(player.expectedLineIndex) || null;
  let delta = 0;

  if (avgIceTime >= 21) delta += 0.035;
  else if (avgIceTime >= 18) delta += 0.024;
  else if (avgIceTime >= 15) delta += 0.012;

  if (lineIndex === 1) delta += 0.012;
  else if (lineIndex === 2) delta += 0.006;

  if (defense >= 80) delta += 0.014;
  else if (defense >= 75) delta += 0.008;
  if (physical >= 80) delta += 0.007;

  return clamp(delta, -0.01, 0.055);
};
