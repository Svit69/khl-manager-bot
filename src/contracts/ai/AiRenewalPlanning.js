import { calculateAge, clamp } from "../SeasonUtils.js";
import {
  POSITION_SCARCITY_TARGETS,
  STRATEGY_MONTHLY_SLOTS,
  STRATEGY_NEGOTIATION_CHANCE,
  average,
  getAverageIceMinutes,
  getPositionGroup,
  getPointsPerGame,
  roundSalaryRub,
} from "./AiRenewalShared.js";

export const buildTeamPlan = (team, standingRow, standingsTable, currentDate) => {
  const roster = team?.getRoster?.() || [];
  const averageAge = average(roster.map((player) => calculateAge(player.identity?.birthDate, currentDate)));
  const pointsPct = standingRow?.gp ? (Number(standingRow.pts) || 0) / (standingRow.gp * 2) : 0.5;
  const rank = standingRow?.rank || null;
  const teamsCount = Math.max(2, standingsTable?.length || 0);
  let strategy = "balanced";

  if (standingRow?.gp >= 18 && (pointsPct < 0.43 || (rank !== null && rank > Math.min(8, teamsCount - 1)))) {
    strategy = averageAge <= 26.5 || pointsPct < 0.38 ? "rebuild" : "balanced";
  } else if (rank !== null && rank <= Math.max(2, Math.ceil(teamsCount / 4)) && pointsPct >= 0.58) {
    strategy = "contender";
  } else if (rank !== null && rank <= Math.min(8, Math.ceil(teamsCount / 2)) && pointsPct >= 0.48) {
    strategy = "competitive";
  }

  return {
    strategy,
    averageAge,
    pointsPct,
    rank,
    negotiationChance: STRATEGY_NEGOTIATION_CHANCE[strategy] || 0.6,
    monthlySlots: STRATEGY_MONTHLY_SLOTS[strategy] || 2,
  };
};

export const getPreferredYears = (player, plan, meta) => {
  const age = meta.age;
  if (meta.isYoungCore) return 4;
  if (age <= 23 && (player.potential?.potential || player.ovr) - player.ovr >= 3) return 3;
  if (plan.strategy === "rebuild" && age >= 29) return 1;
  if (age <= 27) return meta.isCore ? 3 : 2;
  if (age <= 31) return meta.isCore ? 2 : 1;
  return 1;
};

export const getSeedSalary = (player, latestContract, plan, seasonsRemaining) => {
  const lastSalary = Number(latestContract?.salaryRub) || Math.max(1000000, (player.ovr || 70) * 1000000);
  let factor = 1;
  if (plan.strategy === "contender") factor += 0.03;
  if (plan.strategy === "rebuild" && seasonsRemaining > 0) factor -= 0.03;
  return roundSalaryRub(lastSalary * factor);
};

export const getOpeningSalaryFactor = (player, plan, meta) => {
  let factor =
    plan.strategy === "contender"
      ? 1.02
      : plan.strategy === "competitive"
        ? 1
        : plan.strategy === "rebuild"
          ? 0.93
          : 0.97;
  if (meta.isCore) factor += 0.03;
  if (meta.isYoungCore) factor += 0.03;
  if ((player.ovr || 0) >= 82) factor += 0.02;
  if (meta.seasonsRemaining <= 0) factor += 0.02;
  if (plan.strategy === "rebuild" && calculateAge(player.identity?.birthDate) >= 29 && !meta.isYoungCore) factor -= 0.05;
  return clamp(factor, 0.9, 1.12);
};

export const getFreeAgentYears = (player, plan, rosterNeed) => {
  const age = calculateAge(player.identity?.birthDate);
  if (age <= 24 && (player.potential?.potential || player.ovr) - player.ovr >= 3) return 3;
  if (plan.strategy === "rebuild" && age >= 29) return 1;
  if (rosterNeed >= 2) return age <= 27 ? 2 : 1;
  return age <= 28 ? 2 : 1;
};

export const getFreeAgentOpeningFactor = (player, plan, rosterNeed, isUpgrade) => {
  let factor =
    plan.strategy === "contender"
      ? 1.01
      : plan.strategy === "competitive"
        ? 0.99
        : plan.strategy === "rebuild"
          ? 0.94
          : 0.97;
  if (rosterNeed >= 2) factor += 0.03;
  if (isUpgrade) factor += 0.02;
  if (calculateAge(player.identity?.birthDate) >= 31) factor -= 0.02;
  return clamp(factor, 0.9, 1.08);
};

export const scoreCandidate = (team, player, preview, plan, meta) => {
  const age = calculateAge(player.identity?.birthDate, meta.currentDate);
  const averageIce = getAverageIceMinutes(player);
  const ppg = getPointsPerGame(player);
  const potentialGap = Math.max(0, (player.potential?.potential || player.ovr) - player.ovr);
  const projectedTwoYearValue = estimateTwoYearValue(player, age, potentialGap);
  const regressionRisk = estimateRegressionRisk(player, age);
  const scarcity = estimateScarcity(team, player);
  const replaceability = estimateReplaceability(team, player);
  const recentlyAcquired = Number.isFinite(player.affiliation?.acquiredDay) && Number(player.affiliation.acquiredDay) >= 0;
  let score = 0;

  if (meta.seasonsRemaining <= 0) score += 18;
  else if (meta.seasonsRemaining === 1) score += 8;
  else score += 3;

  if (preview.ufaStatus === "NSA" && meta.seasonsRemaining <= 0) score += 5;
  if (meta.isCore) score += 11;
  else if (meta.lineInfo.lineIndex === 3) score += 4;
  else score -= 2;

  if (averageIce >= 19) score += 8;
  else if (averageIce >= 15) score += 5;
  else if (averageIce >= 11) score += 2;

  score += clamp(preview.performanceScore, -6, 10) * 1.1;
  score += clamp(preview.roleScore, -6, 10) * 1.2;
  score += clamp((projectedTwoYearValue - player.ovr) * 1.8, -4, 12);
  score += clamp(scarcity * 4, 0, 6);
  score -= clamp(replaceability * 3.5, 0, 10);
  score -= regressionRisk;

  if ((player.ovr || 0) >= 82) score += 6;
  else if ((player.ovr || 0) >= 78) score += 3;

  if (meta.isYoungCore) score += 10;
  if (age <= 22 && potentialGap >= 3) score += 6;
  if (ppg >= 0.75 && meta.isCore) score += 4;
  if (recentlyAcquired) score -= 5;

  if (plan.strategy === "rebuild") {
    if (age <= 25 || potentialGap >= 4) score += 8;
    if (age >= 29 && !meta.isYoungCore && (player.ovr || 0) < 80) score -= 12;
    if (age >= 32) score -= 8;
  } else if (plan.strategy === "contender") {
    if (age >= 27 && age <= 31 && meta.isCore) score += 5;
    if (meta.isYoungCore) score += 3;
  }

  if (plan.pointsPct < 0.4 && age >= 30 && (player.ovr || 0) < 80) score -= 6;

  return score;
};

const estimateTwoYearValue = (player, age, potentialGap) => {
  const growthRate = Number(player.potential?.growthRate) || 0.3;
  const declineRate = Number(player.potential?.declineRate) || 0.3;
  const peakAge = Number(player.potential?.peakAge) || 27;
  let projection = player.ovr;

  if (age < peakAge) {
    projection += Math.min(potentialGap, Math.max(0.8, 2.6 * growthRate));
  } else {
    projection -= Math.max(0.4, (age - peakAge + 1) * declineRate);
  }

  return projection;
};

const estimateRegressionRisk = (player, age) => {
  const peakAge = Number(player.potential?.peakAge) || 27;
  const declineRate = Number(player.potential?.declineRate) || 0.3;
  if (age <= peakAge) return 0;
  return clamp((age - peakAge) * declineRate * 3.2, 0, 12);
};

const estimateScarcity = (team, player) => {
  const group = getPositionGroup(player.identity?.primaryPosition);
  const sameGroup = (team?.getRoster?.() || []).filter(
    (candidate) => candidate?.id !== player.id && getPositionGroup(candidate.identity?.primaryPosition) === group,
  );
  const targetCount = POSITION_SCARCITY_TARGETS[group] || 9;
  const deficit = Math.max(0, targetCount - sameGroup.length);
  return deficit / Math.max(1, targetCount);
};

const estimateReplaceability = (team, player) => {
  const sameGroup = (team?.getRoster?.() || []).filter(
    (candidate) =>
      candidate?.id !== player.id &&
      getPositionGroup(candidate.identity?.primaryPosition) === getPositionGroup(player.identity?.primaryPosition),
  );
  const comparableCount = sameGroup.filter((candidate) => (candidate.ovr || 0) >= (player.ovr || 0) - 1).length;
  if (comparableCount >= 3) return 1;
  if (comparableCount === 2) return 0.7;
  if (comparableCount === 1) return 0.35;
  return 0;
};
