import { calculateAge, clamp, parseSeasonEnd } from "../SeasonUtils.js";
import {
  OFFSEASON_SIGNINGS_BY_STRATEGY,
  POSITION_SCARCITY_TARGETS,
  getAverageIceMinutes,
  getCurrentSeasonEndYear,
  getLineInfo,
  getPositionGroup,
  roundSalaryRub,
} from "./AiRenewalShared.js";
import {
  getFreeAgentOpeningFactor,
  getFreeAgentYears,
  getOpeningSalaryFactor,
  getPreferredYears,
  getSeedSalary,
  scoreCandidate,
} from "./AiRenewalPlanning.js";

export const collectMonthlyCandidates = ({ contracts, team, context, plan, currentDate, allPlayers }) => {
  const seasonEndYear = getCurrentSeasonEndYear(currentDate);
  const roster = team?.getRoster?.() || [];
  const candidates = [];

  roster.forEach((player) => {
    const contractsForPlayer = contracts.getContractsForPlayer(player.id);
    const latestContract = contractsForPlayer[contractsForPlayer.length - 1] || null;
    if (!latestContract || contracts.isRenewalLocked(player.id, currentDate)) return;

    const contractEndYear = parseSeasonEnd(latestContract.season);
    const seasonsRemaining = contractEndYear - seasonEndYear;
    const lineInfo = getLineInfo(team, player);
    const age = calculateAge(player.identity?.birthDate, currentDate);
    const potentialGap = (player.potential?.potential || player.ovr) - player.ovr;
    const isCore = Boolean(lineInfo.lineIndex && lineInfo.lineIndex <= 2) || getAverageIceMinutes(player) >= 15;
    const isYoungCore = age <= 24 && isCore && potentialGap >= 2;
    const shouldReviewNow =
      seasonsRemaining <= 0 ||
      (seasonsRemaining === 1 && (isCore || isYoungCore || (player.ovr || 0) >= 80)) ||
      (seasonsRemaining === 2 && isYoungCore && (player.ovr || 0) >= 76);
    if (!shouldReviewNow) return;

    const preferredYears = getPreferredYears(player, plan, { seasonsRemaining, isCore, isYoungCore, age });
    const seedSalary = getSeedSalary(player, latestContract, plan, seasonsRemaining);
    const firstPreview = contracts.getRenewalPreview(
      team,
      player,
      { years: preferredYears, salaryRub: seedSalary },
      { ...context, allPlayers },
    );

    const openingOffer = {
      years: preferredYears,
      salaryRub: roundSalaryRub(
        firstPreview.teamAdjustedDemand * getOpeningSalaryFactor(player, plan, { isCore, isYoungCore, seasonsRemaining }),
      ),
    };
    const preview = contracts.getRenewalPreview(team, player, openingOffer, { ...context, allPlayers });
    const priorityScore = scoreCandidate(team, player, preview, plan, {
      currentDate,
      seasonsRemaining,
      isCore,
      isYoungCore,
      lineInfo,
    });

    if (priorityScore < 8) return;
    candidates.push({
      player,
      latestContract,
      lineInfo,
      preview,
      openingOffer,
      seasonsRemaining,
      isCore,
      isYoungCore,
      priorityScore,
    });
  });

  const expiringCount = candidates.filter((candidate) => candidate.seasonsRemaining <= 0).length;
  if (expiringCount >= 4) {
    candidates.forEach((candidate) => {
      if (candidate.seasonsRemaining <= 0) candidate.priorityScore += 4;
    });
  }

  return sortCandidates(candidates);
};

export const buildOffseasonCandidates = ({ contracts, team, currentSeasonLabel, context, plan, currentDate }) =>
  sortCandidates(
    (team?.getRoster?.() || [])
      .map((player) => buildOffseasonCandidate({ contracts, team, player, currentSeasonLabel, context, plan, currentDate }))
      .filter(Boolean),
  );

export const buildOffseasonFreeAgentCandidates = ({ contracts, team, freeAgents, context, plan }) =>
  sortCandidates(
    (freeAgents || [])
      .filter((player) => !player?.affiliation?.teamId)
      .map((player) => buildOffseasonFreeAgentCandidate({ contracts, team, player, context, plan }))
      .filter(Boolean),
  );

export const getOffseasonSigningSlots = (team, plan) => {
  const roster = team?.getRoster?.() || [];
  const slotsToFill = Math.max(0, 20 - roster.length);
  const maxSignings = OFFSEASON_SIGNINGS_BY_STRATEGY[plan.strategy] || 4;
  return Math.max(0, Math.min(maxSignings, slotsToFill));
};

const buildOffseasonCandidate = ({ contracts, team, player, currentSeasonLabel, context, plan, currentDate }) => {
  const contractsForPlayer = contracts.getContractsForPlayer(player.id);
  const latestContract = contractsForPlayer[contractsForPlayer.length - 1] || null;
  if (!latestContract || latestContract.season !== currentSeasonLabel || contracts.isRenewalLocked(player.id, currentDate)) return null;

  const lineInfo = getLineInfo(team, player);
  const age = calculateAge(player.identity?.birthDate, currentDate);
  const potentialGap = (player.potential?.potential || player.ovr) - player.ovr;
  const isCore = Boolean(lineInfo.lineIndex && lineInfo.lineIndex <= 2) || getAverageIceMinutes(player) >= 15;
  const isYoungCore = age <= 24 && isCore && potentialGap >= 2;
  const preferredYears = getPreferredYears(player, plan, { seasonsRemaining: 0, isCore, isYoungCore, age });
  const preview = contracts.getRenewalPreview(
    team,
    player,
    {
      years: preferredYears,
      salaryRub: getSeedSalary(player, latestContract, plan, 0),
    },
    context,
  );
  const openingOffer = {
    years: preferredYears,
    salaryRub: roundSalaryRub(
      preview.teamAdjustedDemand * getOpeningSalaryFactor(player, plan, { isCore, isYoungCore, seasonsRemaining: 0 }),
    ),
  };
  const finalPreview = contracts.getRenewalPreview(team, player, openingOffer, context);
  const priorityScore = scoreCandidate(team, player, finalPreview, plan, {
    currentDate,
    seasonsRemaining: 0,
    isCore,
    isYoungCore,
    lineInfo,
  });
  if (priorityScore < 10) return null;
  return { player, latestContract, lineInfo, preview: finalPreview, openingOffer, seasonsRemaining: 0, isCore, isYoungCore, priorityScore };
};

const buildOffseasonFreeAgentCandidate = ({ contracts, team, player, context, plan }) => {
  if (player.identity?.isGoalie) return null;
  const roster = team?.getRoster?.() || [];
  const positionGroup = getPositionGroup(player.identity?.primaryPosition);
  const sameGroup = roster.filter((candidate) => getPositionGroup(candidate.identity?.primaryPosition) === positionGroup);
  const averageGroupOvr = sameGroup.length ? sameGroup.reduce((sum, candidate) => sum + (candidate.ovr || 0), 0) / sameGroup.length : 0;
  const rosterNeed = Math.max(0, (POSITION_SCARCITY_TARGETS[positionGroup] || 5) - sameGroup.length);
  const isUpgrade = !sameGroup.length || (player.ovr || 0) >= averageGroupOvr + 1;
  const years = getFreeAgentYears(player, plan, rosterNeed);
  const preview = contracts.getFreeAgentPreview(
    team,
    player,
    {
      years,
      salaryRub: Math.max(500000, Math.round((player.ovr || 70) * 1000000)),
    },
    context,
  );
  const openingOffer = {
    years,
    salaryRub: roundSalaryRub(preview.teamAdjustedDemand * getFreeAgentOpeningFactor(player, plan, rosterNeed, isUpgrade)),
  };
  const finalPreview = contracts.getFreeAgentPreview(team, player, openingOffer, context);
  let priorityScore = 0;
  priorityScore += rosterNeed * 5;
  priorityScore += isUpgrade ? 6 : 1;
  priorityScore += clamp((player.ovr || 0) - averageGroupOvr, -4, 8);
  priorityScore += clamp(finalPreview.projectedRoleScore || 0, -4, 10);
  priorityScore += clamp(finalPreview.teamStrengthAppeal || 0, -4, 8);
  if (plan.strategy === "rebuild" && calculateAge(player.identity?.birthDate, context.currentDate) >= 29 && (player.ovr || 0) < 79) {
    priorityScore -= 8;
  }
  if (plan.strategy === "contender" && isUpgrade) priorityScore += 3;
  if (priorityScore < 10) return null;
  return { player, preview: finalPreview, openingOffer, priorityScore, rosterNeed, isUpgrade };
};

const sortCandidates = (candidates) =>
  candidates.sort(
    (left, right) =>
      right.priorityScore - left.priorityScore ||
      (right.player.ovr - left.player.ovr) ||
      left.player.name.localeCompare(right.player.name, "ru"),
  );
