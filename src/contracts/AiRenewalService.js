import { calculateAge, clamp, parseSeasonEnd } from "./SeasonUtils.js";

const FORWARD_POSITIONS = new Set(["ЛНП", "ЦТР", "ПНП"]);
const POSITION_SCARCITY_TARGETS = { FWD: 9, DEF: 6, G: 2 };
const STRATEGY_NEGOTIATION_CHANCE = {
  contender: 0.9,
  competitive: 0.78,
  balanced: 0.62,
  rebuild: 0.38,
};
const STRATEGY_MONTHLY_SLOTS = {
  contender: 4,
  competitive: 3,
  balanced: 2,
  rebuild: 1,
};

const average = (values) =>
  values.length ? values.reduce((total, value) => total + value, 0) / values.length : 0;

const roundSalaryRub = (value) =>
  Math.max(500000, Math.round((Number(value) || 0) / 500000) * 500000);

const getPositionGroup = (position) => {
  if (position === "ЗАЩ") return "DEF";
  if (position === "ВРТ") return "G";
  if (FORWARD_POSITIONS.has(position)) return "FWD";
  return "FWD";
};

const getCurrentSeasonEndYear = (currentDate) => {
  const date = new Date(currentDate);
  if (Number.isNaN(date.getTime())) return 2026;
  const month = date.getUTCMonth();
  const year = date.getUTCFullYear();
  return month >= 8 ? year + 1 : year;
};

const getAverageIceMinutes = (player) => {
  const games = Math.max(1, Number(player?.seasonStats?.games) || 0);
  return ((Number(player?.seasonStats?.totalIceTime) || 0) / 60) / games;
};

const getPointsPerGame = (player) => {
  const games = Math.max(1, Number(player?.seasonStats?.games) || 0);
  const points =
    Number(player?.seasonStats?.points) ||
    (Number(player?.seasonStats?.goals) || 0) + (Number(player?.seasonStats?.assists) || 0);
  return points / games;
};

const getLineInfo = (team, player) => {
  const lines = team?.lines || [];
  for (let index = 0; index < lines.length; index++) {
    const slotIndex = (lines[index]?.players || []).findIndex((candidate) => candidate?.id === player?.id);
    if (slotIndex !== -1) {
      return {
        lineIndex: index + 1,
        slotIndex,
        slotPosition: lines[index]?.positions?.[slotIndex] || player?.identity?.primaryPosition || null,
      };
    }
  }
  return { lineIndex: null, slotIndex: null, slotPosition: null };
};

export class AiRenewalService {
  #contracts;

  constructor(contractService) {
    this.#contracts = contractService;
  }

  processMonthlyRenewals({ teams, activeTeamId, standingsTable, currentDate, currentDay, allPlayers, buildContext }) {
    const standingsIndex = new Map((standingsTable || []).map((row, index) => [row.teamId, { ...row, rank: index + 1 }]));
    const notifications = [];

    (teams || [])
      .filter((team) => team?.id && team.id !== activeTeamId)
      .forEach((team) => {
        const context = buildContext(team);
        const plan = this.#buildTeamPlan(team, standingsIndex.get(team.id), standingsTable, currentDate);
        const candidates = this.#collectCandidates(team, context, plan, currentDate, allPlayers);
        if (!candidates.length) return;
        if (Math.random() > plan.negotiationChance) return;

        let remainingSlots = Math.min(plan.monthlySlots, candidates.length);
        for (const candidate of candidates) {
          if (remainingSlots <= 0) break;
          const result = this.#runNegotiation(team, candidate, context, plan);
          if (result?.acceptedContract) {
            notifications.push(
              this.#buildNotification({
                team,
                player: candidate.player,
                contract: result.acceptedContract,
                currentDay,
              }),
            );
            remainingSlots -= 1;
          } else if (result?.attempted) {
            remainingSlots -= 1;
          }
        }
      });

    return notifications;
  }

  processOffseasonRenewals({ teams, activeTeamId, standingsTable, currentSeasonLabel, negotiationDate, currentDay, allPlayers, buildContext }) {
    const standingsIndex = new Map((standingsTable || []).map((row, index) => [row.teamId, { ...row, rank: index + 1 }]));
    const notifications = [];

    (teams || [])
      .filter((team) => team?.id && team.id !== activeTeamId)
      .forEach((team) => {
        const plan = this.#buildTeamPlan(team, standingsIndex.get(team.id), standingsTable, negotiationDate);
        const context = { ...buildContext(team), currentDate: negotiationDate, allPlayers };
        const candidates = (team?.getRoster?.() || [])
          .map((player) => this.#buildOffseasonCandidate(team, player, currentSeasonLabel, context, plan, negotiationDate))
          .filter(Boolean)
          .sort((left, right) =>
            (right.priorityScore - left.priorityScore) ||
            (right.player.ovr - left.player.ovr) ||
            left.player.name.localeCompare(right.player.name, "ru"),
          );

        const offseasonSlotsByStrategy = {
          contender: 8,
          competitive: 7,
          balanced: 6,
          rebuild: 4,
        };
        let remainingSlots = Math.min(offseasonSlotsByStrategy[plan.strategy] || 5, candidates.length);
        for (const candidate of candidates) {
          if (remainingSlots <= 0) break;
          const result = this.#runNegotiation(team, candidate, context, plan);
          if (result?.acceptedContract) {
            notifications.push(this.#buildNotification({ team, player: candidate.player, contract: result.acceptedContract, currentDay }));
          }
          if (result?.attempted) remainingSlots -= 1;
        }
      });

    return notifications;
  }

  processOffseasonFreeAgency({ teams, activeTeamId, standingsTable, freeAgents, negotiationDate, currentDay, allPlayers, buildContext }) {
    const standingsIndex = new Map((standingsTable || []).map((row, index) => [row.teamId, { ...row, rank: index + 1 }]));
    const notifications = [];

    (teams || [])
      .filter((team) => team?.id && team.id !== activeTeamId)
      .forEach((team) => {
        const plan = this.#buildTeamPlan(team, standingsIndex.get(team.id), standingsTable, negotiationDate);
        const roster = team?.getRoster?.() || [];
        const slotsToFill = Math.max(0, 20 - roster.length);
        const maxSigningsByStrategy = {
          contender: 6,
          competitive: 6,
          balanced: 5,
          rebuild: 4,
        };
        const needsSignings = Math.max(0, Math.min(maxSigningsByStrategy[plan.strategy] || 4, slotsToFill));
        if (!needsSignings) return;

        const context = { ...buildContext(team), currentDate: negotiationDate, allPlayers };
        const candidates = (freeAgents || [])
          .filter((player) => !player?.affiliation?.teamId)
          .map((player) => this.#buildOffseasonFreeAgentCandidate(team, player, context, plan))
          .filter(Boolean)
          .sort((left, right) =>
            (right.priorityScore - left.priorityScore) ||
            (right.player.ovr - left.player.ovr) ||
            left.player.name.localeCompare(right.player.name, "ru"),
          );

        let remainingSlots = Math.min(needsSignings, candidates.length);
        for (const candidate of candidates) {
          if (remainingSlots <= 0) break;
          const result = this.#runFreeAgentNegotiation(team, candidate, context, plan);
          if (result?.acceptedContract) {
            notifications.push(this.#buildSigningNotification({ team, player: candidate.player, contract: result.acceptedContract, currentDay }));
            remainingSlots -= 1;
          }
        }
      });

    return notifications;
  }

  #buildTeamPlan(team, standingRow, standingsTable, currentDate) {
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
  }

  #buildOffseasonCandidate(team, player, currentSeasonLabel, context, plan, currentDate) {
    const contracts = this.#contracts.getContractsForPlayer(player.id);
    const latestContract = contracts[contracts.length - 1] || null;
    if (!latestContract || latestContract.season !== currentSeasonLabel || this.#contracts.isRenewalLocked(player.id)) return null;

    const lineInfo = getLineInfo(team, player);
    const age = calculateAge(player.identity?.birthDate, currentDate);
    const potentialGap = (player.potential?.potential || player.ovr) - player.ovr;
    const isCore = Boolean(lineInfo.lineIndex && lineInfo.lineIndex <= 2) || getAverageIceMinutes(player) >= 15;
    const isYoungCore = age <= 24 && isCore && potentialGap >= 2;
    const preferredYears = this.#getPreferredYears(player, plan, { seasonsRemaining: 0, isCore, isYoungCore, age });
    const preview = this.#contracts.getRenewalPreview(team, player, {
      years: preferredYears,
      salaryRub: this.#getSeedSalary(player, latestContract, plan, 0),
    }, context);
    const openingOffer = {
      years: preferredYears,
      salaryRub: roundSalaryRub(preview.teamAdjustedDemand * this.#getOpeningSalaryFactor(player, plan, { isCore, isYoungCore, seasonsRemaining: 0 })),
    };
    const finalPreview = this.#contracts.getRenewalPreview(team, player, openingOffer, context);
    const priorityScore = this.#scoreCandidate(team, player, latestContract, finalPreview, plan, {
      currentDate,
      seasonsRemaining: 0,
      isCore,
      isYoungCore,
      lineInfo,
    });
    if (priorityScore < 10) return null;
    return { player, latestContract, lineInfo, preview: finalPreview, openingOffer, seasonsRemaining: 0, isCore, isYoungCore, priorityScore };
  }

  #buildOffseasonFreeAgentCandidate(team, player, context, plan) {
    if (player.identity?.isGoalie) return null;
    const roster = team?.getRoster?.() || [];
    const positionGroup = getPositionGroup(player.identity?.primaryPosition);
    const sameGroup = roster.filter((candidate) => getPositionGroup(candidate.identity?.primaryPosition) === positionGroup);
    const averageGroupOvr = average(sameGroup.map((candidate) => candidate.ovr || 0));
    const rosterNeed = Math.max(0, (POSITION_SCARCITY_TARGETS[positionGroup] || 5) - sameGroup.length);
    const isUpgrade = !sameGroup.length || (player.ovr || 0) >= averageGroupOvr + 1;
    const preview = this.#contracts.getFreeAgentPreview(team, player, {
      years: this.#getFreeAgentYears(player, plan, rosterNeed),
      salaryRub: Math.max(500000, Math.round((player.ovr || 70) * 1000000)),
    }, context);
    const openingOffer = {
      years: this.#getFreeAgentYears(player, plan, rosterNeed),
      salaryRub: roundSalaryRub(preview.teamAdjustedDemand * this.#getFreeAgentOpeningFactor(player, plan, rosterNeed, isUpgrade)),
    };
    const finalPreview = this.#contracts.getFreeAgentPreview(team, player, openingOffer, context);
    let priorityScore = 0;
    priorityScore += rosterNeed * 5;
    priorityScore += isUpgrade ? 6 : 1;
    priorityScore += clamp((player.ovr || 0) - averageGroupOvr, -4, 8);
    priorityScore += clamp(finalPreview.projectedRoleScore || 0, -4, 10);
    priorityScore += clamp(finalPreview.teamStrengthAppeal || 0, -4, 8);
    if (plan.strategy === "rebuild" && calculateAge(player.identity?.birthDate, context.currentDate) >= 29 && (player.ovr || 0) < 79) priorityScore -= 8;
    if (plan.strategy === "contender" && isUpgrade) priorityScore += 3;
    if (priorityScore < 10) return null;
    return { player, preview: finalPreview, openingOffer, priorityScore, rosterNeed, isUpgrade };
  }

  #collectCandidates(team, context, plan, currentDate, allPlayers) {
    const seasonEndYear = getCurrentSeasonEndYear(currentDate);
    const roster = team?.getRoster?.() || [];
    const candidates = [];

    roster.forEach((player) => {
      const contracts = this.#contracts.getContractsForPlayer(player.id);
      const latestContract = contracts[contracts.length - 1] || null;
      if (!latestContract || this.#contracts.isRenewalLocked(player.id)) return;

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

      const preferredYears = this.#getPreferredYears(player, plan, { seasonsRemaining, isCore, isYoungCore, age });
      const seedSalary = this.#getSeedSalary(player, latestContract, plan, seasonsRemaining);
      const firstPreview = this.#contracts.getRenewalPreview(
        team,
        player,
        { years: preferredYears, salaryRub: seedSalary },
        { ...context, allPlayers },
      );

      const openingOffer = {
        years: preferredYears,
        salaryRub: roundSalaryRub(firstPreview.teamAdjustedDemand * this.#getOpeningSalaryFactor(player, plan, { isCore, isYoungCore, seasonsRemaining })),
      };
      const preview = this.#contracts.getRenewalPreview(team, player, openingOffer, { ...context, allPlayers });
      const priorityScore = this.#scoreCandidate(team, player, latestContract, preview, plan, {
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

    return candidates.sort((left, right) =>
      (right.priorityScore - left.priorityScore) ||
      (right.player.ovr - left.player.ovr) ||
      left.player.name.localeCompare(right.player.name, "ru"),
    );
  }

  #scoreCandidate(team, player, latestContract, preview, plan, meta) {
    const age = calculateAge(player.identity?.birthDate, meta.currentDate);
    const averageIce = getAverageIceMinutes(player);
    const ppg = getPointsPerGame(player);
    const potentialGap = Math.max(0, (player.potential?.potential || player.ovr) - player.ovr);
    const projectedTwoYearValue = this.#estimateTwoYearValue(player, age, potentialGap);
    const regressionRisk = this.#estimateRegressionRisk(player, age);
    const scarcity = this.#estimateScarcity(team, player);
    const replaceability = this.#estimateReplaceability(team, player);
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
  }

  #estimateTwoYearValue(player, age, potentialGap) {
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
  }

  #estimateRegressionRisk(player, age) {
    const peakAge = Number(player.potential?.peakAge) || 27;
    const declineRate = Number(player.potential?.declineRate) || 0.3;
    if (age <= peakAge) return 0;
    return clamp((age - peakAge) * declineRate * 3.2, 0, 12);
  }

  #estimateScarcity(team, player) {
    const group = getPositionGroup(player.identity?.primaryPosition);
    const sameGroup = (team?.getRoster?.() || []).filter(
      (candidate) => candidate?.id !== player.id && getPositionGroup(candidate.identity?.primaryPosition) === group,
    );
    const targetCount = POSITION_SCARCITY_TARGETS[group] || 9;
    const deficit = Math.max(0, targetCount - sameGroup.length);
    return deficit / Math.max(1, targetCount);
  }

  #estimateReplaceability(team, player) {
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
  }

  #getPreferredYears(player, plan, meta) {
    const age = meta.age;
    if (meta.isYoungCore) return 4;
    if (age <= 23 && (player.potential?.potential || player.ovr) - player.ovr >= 3) return 3;
    if (plan.strategy === "rebuild" && age >= 29) return 1;
    if (age <= 27) return meta.isCore ? 3 : 2;
    if (age <= 31) return meta.isCore ? 2 : 1;
    return 1;
  }

  #getSeedSalary(player, latestContract, plan, seasonsRemaining) {
    const lastSalary = Number(latestContract?.salaryRub) || Math.max(1000000, (player.ovr || 70) * 1000000);
    let factor = 1;
    if (plan.strategy === "contender") factor += 0.03;
    if (plan.strategy === "rebuild" && seasonsRemaining > 0) factor -= 0.03;
    return roundSalaryRub(lastSalary * factor);
  }

  #getOpeningSalaryFactor(player, plan, meta) {
    let factor = plan.strategy === "contender" ? 1.02 : plan.strategy === "competitive" ? 1 : plan.strategy === "rebuild" ? 0.93 : 0.97;
    if (meta.isCore) factor += 0.03;
    if (meta.isYoungCore) factor += 0.03;
    if ((player.ovr || 0) >= 82) factor += 0.02;
    if (meta.seasonsRemaining <= 0) factor += 0.02;
    if (plan.strategy === "rebuild" && calculateAge(player.identity?.birthDate) >= 29 && !meta.isYoungCore) factor -= 0.05;
    return clamp(factor, 0.9, 1.12);
  }

  #runNegotiation(team, candidate, context, plan) {
    const firstResult = this.#contracts.submitRenewalOffer(team, candidate.player, candidate.openingOffer, context);
    if (firstResult?.decision === "accept") {
      return { attempted: true, acceptedContract: firstResult.newContracts?.[firstResult.newContracts.length - 1] || null };
    }
    if (firstResult?.decision !== "counter" || !firstResult.counter) {
      return { attempted: true, acceptedContract: null };
    }

    if (!this.#isCounterAcceptable(candidate, firstResult.counter, plan)) {
      return { attempted: true, acceptedContract: null };
    }

    const secondResult = this.#contracts.submitRenewalOffer(team, candidate.player, firstResult.counter, context);
    if (secondResult?.decision === "accept") {
      return { attempted: true, acceptedContract: secondResult.newContracts?.[secondResult.newContracts.length - 1] || null };
    }
    return { attempted: true, acceptedContract: null };
  }

  #runFreeAgentNegotiation(team, candidate, context, plan) {
    const firstResult = this.#contracts.submitFreeAgentOffer(team, candidate.player, candidate.openingOffer, context);
    if (firstResult?.decision === "accept") {
      return { attempted: true, acceptedContract: firstResult.newContracts?.[firstResult.newContracts.length - 1] || null };
    }
    if (firstResult?.decision !== "counter" || !firstResult.counter) {
      return { attempted: true, acceptedContract: null };
    }

    if (!this.#isFreeAgentCounterAcceptable(candidate, firstResult.counter, plan)) {
      return { attempted: true, acceptedContract: null };
    }

    const secondResult = this.#contracts.submitFreeAgentOffer(team, candidate.player, firstResult.counter, context);
    if (secondResult?.decision === "accept") {
      return { attempted: true, acceptedContract: secondResult.newContracts?.[secondResult.newContracts.length - 1] || null };
    }
    return { attempted: true, acceptedContract: null };
  }

  #isCounterAcceptable(candidate, counter, plan) {
    const age = calculateAge(candidate.player.identity?.birthDate);
    const hardSalaryCapFactor =
      plan.strategy === "contender"
        ? (candidate.isCore ? 1.14 : 1.08)
        : plan.strategy === "competitive"
          ? (candidate.isCore ? 1.1 : 1.05)
          : plan.strategy === "rebuild"
            ? (candidate.isYoungCore ? 1.08 : 0.98)
            : (candidate.isCore ? 1.08 : 1.02);

    let maxYears = candidate.isYoungCore ? 4 : candidate.isCore ? 3 : 2;
    if (age >= 31) maxYears = 2;
    if (age >= 34 || (plan.strategy === "rebuild" && age >= 29 && !candidate.isYoungCore)) maxYears = 1;

    const allowedSalary = roundSalaryRub(candidate.preview.teamAdjustedDemand * hardSalaryCapFactor);
    return Number(counter.salaryRub) <= allowedSalary && Number(counter.years) <= maxYears;
  }

  #isFreeAgentCounterAcceptable(candidate, counter, plan) {
    const age = calculateAge(candidate.player.identity?.birthDate);
    const hardSalaryCapFactor = plan.strategy === "contender" ? 1.08 : plan.strategy === "competitive" ? 1.05 : plan.strategy === "rebuild" ? 0.98 : 1.02;
    let maxYears = candidate.rosterNeed >= 2 ? 2 : 3;
    if (age >= 30) maxYears = Math.min(maxYears, 2);
    if (plan.strategy === "rebuild" && age >= 28 && !candidate.isUpgrade) maxYears = 1;
    const allowedSalary = roundSalaryRub(candidate.preview.teamAdjustedDemand * hardSalaryCapFactor);
    return Number(counter.salaryRub) <= allowedSalary && Number(counter.years) <= maxYears;
  }

  #getFreeAgentYears(player, plan, rosterNeed) {
    const age = calculateAge(player.identity?.birthDate);
    if (age <= 24 && (player.potential?.potential || player.ovr) - player.ovr >= 3) return 3;
    if (plan.strategy === "rebuild" && age >= 29) return 1;
    if (rosterNeed >= 2) return age <= 27 ? 2 : 1;
    return age <= 28 ? 2 : 1;
  }

  #getFreeAgentOpeningFactor(player, plan, rosterNeed, isUpgrade) {
    let factor = plan.strategy === "contender" ? 1.01 : plan.strategy === "competitive" ? 0.99 : plan.strategy === "rebuild" ? 0.94 : 0.97;
    if (rosterNeed >= 2) factor += 0.03;
    if (isUpgrade) factor += 0.02;
    if (calculateAge(player.identity?.birthDate) >= 31) factor -= 0.02;
    return clamp(factor, 0.9, 1.08);
  }

  #buildNotification({ team, player, contract, currentDay }) {
    const endYear = parseSeasonEnd(contract?.season);
    const salaryMillions = ((Number(contract?.salaryRub) || 0) / 1000000).toFixed(1).replace(".0", "");
    return {
      id: `notification-ai-renewal-${team.id}-${player.id}-${currentDay}-${Math.random().toString(36).slice(2, 8)}`,
      type: "ai-renewal",
      title: "\u041a\u043e\u043d\u0442\u0440\u0430\u043a\u0442\u044b \u0418\u0418",
      message: `\u041a\u043e\u043c\u0430\u043d\u0434\u0430 ${team.name} \u043f\u0440\u043e\u0434\u043b\u0438\u043b\u0430 \u0438\u0433\u0440\u043e\u043a\u0430 ${player.name} ${player.ovr} \u0434\u043e ${endYear} \u0441 \u0437\u0430\u0440\u043f\u043b\u0430\u0442\u043e\u0439 ${salaryMillions} \u043c\u043b\u043d`,
      day: currentDay,
      createdAt: new Date().toISOString(),
      playerId: player.id,
      read: false,
    };
  }

  #buildSigningNotification({ team, player, contract, currentDay }) {
    const endYear = parseSeasonEnd(contract?.season);
    const salaryMillions = ((Number(contract?.salaryRub) || 0) / 1000000).toFixed(1).replace(".0", "");
    return {
      id: `notification-ai-signing-${team.id}-${player.id}-${currentDay}-${Math.random().toString(36).slice(2, 8)}`,
      type: "ai-signing",
      title: "\u0420\u044b\u043d\u043e\u043a \u0418\u0418",
      message: `\u041a\u043e\u043c\u0430\u043d\u0434\u0430 ${team.name} \u043f\u043e\u0434\u043f\u0438\u0441\u0430\u043b\u0430 ${player.name} ${player.ovr} \u0434\u043e ${endYear} \u0441 \u0437\u0430\u0440\u043f\u043b\u0430\u0442\u043e\u0439 ${salaryMillions} \u043c\u043b\u043d`,
      day: currentDay,
      createdAt: new Date().toISOString(),
      playerId: player.id,
      read: false,
    };
  }
}
