import { calculateAge, parseSeasonEnd } from "../SeasonUtils.js";
import { roundSalaryRub } from "./AiRenewalShared.js";

export const runRenewalNegotiation = ({ contracts, team, candidate, context, plan }) => {
  const firstResult = contracts.submitRenewalOffer(team, candidate.player, candidate.openingOffer, context);
  if (firstResult?.decision === "accept") {
    return { attempted: true, acceptedContract: firstResult.newContracts?.[firstResult.newContracts.length - 1] || null };
  }
  if (firstResult?.decision !== "counter" || !firstResult.counter) {
    return { attempted: true, acceptedContract: null };
  }

  if (!isRenewalCounterAcceptable(candidate, firstResult.counter, plan)) {
    return { attempted: true, acceptedContract: null };
  }

  const secondResult = contracts.submitRenewalOffer(team, candidate.player, firstResult.counter, context);
  if (secondResult?.decision === "accept") {
    return { attempted: true, acceptedContract: secondResult.newContracts?.[secondResult.newContracts.length - 1] || null };
  }
  return { attempted: true, acceptedContract: null };
};

export const runFreeAgentNegotiation = ({ contracts, team, candidate, context, plan }) => {
  const firstResult = contracts.submitFreeAgentOffer(team, candidate.player, candidate.openingOffer, context);
  if (firstResult?.decision === "accept") {
    return { attempted: true, acceptedContract: firstResult.newContracts?.[firstResult.newContracts.length - 1] || null };
  }
  if (firstResult?.decision !== "counter" || !firstResult.counter) {
    return { attempted: true, acceptedContract: null };
  }

  if (!isFreeAgentCounterAcceptable(candidate, firstResult.counter, plan)) {
    return { attempted: true, acceptedContract: null };
  }

  const secondResult = contracts.submitFreeAgentOffer(team, candidate.player, firstResult.counter, context);
  if (secondResult?.decision === "accept") {
    return { attempted: true, acceptedContract: secondResult.newContracts?.[secondResult.newContracts.length - 1] || null };
  }
  return { attempted: true, acceptedContract: null };
};

export const buildRenewalNotification = ({ team, player, contract, currentDay }) => {
  const endYear = parseSeasonEnd(contract?.season);
  const salaryMillions = ((Number(contract?.salaryRub) || 0) / 1000000).toFixed(1).replace(".0", "");
  return {
    id: `notification-ai-renewal-${team.id}-${player.id}-${currentDay}-${Math.random().toString(36).slice(2, 8)}`,
    type: "ai-renewal",
    title: "Контракты ИИ",
    message: `Команда ${team.name} продлила игрока ${player.name} ${player.ovr} до ${endYear} с зарплатой ${salaryMillions} млн`,
    day: currentDay,
    createdAt: new Date().toISOString(),
    playerId: player.id,
    read: false,
  };
};

export const buildSigningNotification = ({ team, player, contract, currentDay }) => {
  const endYear = parseSeasonEnd(contract?.season);
  const salaryMillions = ((Number(contract?.salaryRub) || 0) / 1000000).toFixed(1).replace(".0", "");
  return {
    id: `notification-ai-signing-${team.id}-${player.id}-${currentDay}-${Math.random().toString(36).slice(2, 8)}`,
    type: "ai-signing",
    title: "Рынок ИИ",
    message: `Команда ${team.name} подписала ${player.name} ${player.ovr} до ${endYear} с зарплатой ${salaryMillions} млн`,
    day: currentDay,
    createdAt: new Date().toISOString(),
    playerId: player.id,
    read: false,
  };
};

const isRenewalCounterAcceptable = (candidate, counter, plan) => {
  const age = calculateAge(candidate.player.identity?.birthDate);
  const hardSalaryCapFactor =
    plan.strategy === "contender"
      ? candidate.isCore
        ? 1.14
        : 1.08
      : plan.strategy === "competitive"
        ? candidate.isCore
          ? 1.1
          : 1.05
        : plan.strategy === "rebuild"
          ? candidate.isYoungCore
            ? 1.08
            : 0.98
          : candidate.isCore
            ? 1.08
            : 1.02;

  let maxYears = candidate.isYoungCore ? 4 : candidate.isCore ? 3 : 2;
  if (age >= 31) maxYears = 2;
  if (age >= 34 || (plan.strategy === "rebuild" && age >= 29 && !candidate.isYoungCore)) maxYears = 1;

  const allowedSalary = roundSalaryRub(candidate.preview.teamAdjustedDemand * hardSalaryCapFactor);
  return Number(counter.salaryRub) <= allowedSalary && Number(counter.years) <= maxYears;
};

const isFreeAgentCounterAcceptable = (candidate, counter, plan) => {
  const age = calculateAge(candidate.player.identity?.birthDate);
  const hardSalaryCapFactor =
    plan.strategy === "contender" ? 1.08 : plan.strategy === "competitive" ? 1.05 : plan.strategy === "rebuild" ? 0.98 : 1.02;
  let maxYears = candidate.rosterNeed >= 2 ? 2 : 3;
  if (age >= 30) maxYears = Math.min(maxYears, 2);
  if (plan.strategy === "rebuild" && age >= 28 && !candidate.isUpgrade) maxYears = 1;
  const allowedSalary = roundSalaryRub(candidate.preview.teamAdjustedDemand * hardSalaryCapFactor);
  return Number(counter.salaryRub) <= allowedSalary && Number(counter.years) <= maxYears;
};
