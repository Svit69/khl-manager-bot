import { OFFSEASON_RENEWAL_SLOTS_BY_STRATEGY } from "./ai/AiRenewalShared.js";
import { buildTeamPlan } from "./ai/AiRenewalPlanning.js";
import {
  buildOffseasonCandidates,
  buildOffseasonFreeAgentCandidates,
  collectMonthlyCandidates,
  getOffseasonSigningSlots,
} from "./ai/AiRenewalCandidates.js";
import {
  buildRenewalNotification,
  buildSigningNotification,
  runFreeAgentNegotiation,
  runRenewalNegotiation,
} from "./ai/AiRenewalNegotiation.js";

export class AiRenewalService {
  #contracts;

  constructor(contractService) {
    this.#contracts = contractService;
  }

  processMonthlyRenewals({ teams, activeTeamId, standingsTable, currentDate, currentDay, allPlayers, buildContext }) {
    if (!shouldRunMonthlyRenewals(currentDate)) return [];
    const standingsIndex = createStandingsIndex(standingsTable);
    const notifications = [];

    for (const team of getManagedAiTeams(teams, activeTeamId)) {
      const context = buildContext(team);
      const plan = buildTeamPlan(team, standingsIndex.get(team.id), standingsTable, currentDate);
      const candidates = collectMonthlyCandidates({
        contracts: this.#contracts,
        team,
        context,
        plan,
        currentDate,
        allPlayers,
      });
      if (!candidates.length || Math.random() > plan.negotiationChance) continue;

      let remainingSlots = Math.min(plan.monthlySlots, candidates.length);
      for (const candidate of candidates) {
        if (remainingSlots <= 0) break;
        const result = runRenewalNegotiation({
          contracts: this.#contracts,
          team,
          candidate,
          context,
          plan,
        });
        if (result?.acceptedContract) {
          notifications.push(
            buildRenewalNotification({
              team,
              player: candidate.player,
              contract: result.acceptedContract,
              currentDay,
            }),
          );
        }
        if (result?.attempted) remainingSlots -= 1;
      }
    }

    return notifications;
  }

  buildPreseasonFreeAgencyOffers({
    teams,
    activeTeamId,
    standingsTable,
    freeAgents,
    negotiationDate,
    currentDay,
    allPlayers,
    buildContext,
    existingOffers = [],
  }) {
    const standingsIndex = createStandingsIndex(standingsTable);
    const existingOfferKeys = new Set(
      (existingOffers || [])
        .map((entry) => (entry?.playerId && entry?.teamId ? `${entry.teamId}:${entry.playerId}` : null))
        .filter(Boolean),
    );
    const offers = [];

    for (const team of getManagedAiTeams(teams, activeTeamId)) {
      const plan = buildTeamPlan(team, standingsIndex.get(team.id), standingsTable, negotiationDate);
      const roster = team?.getRoster?.() || [];
      const sizeNeed = Math.max(0, 20 - roster.length);
      if (!sizeNeed) continue;

      const context = { ...buildContext(team), currentDate: negotiationDate, allPlayers };
      const candidates = buildOffseasonFreeAgentCandidates({
        contracts: this.#contracts,
        team,
        freeAgents,
        context,
        plan,
      });
      if (!candidates.length) continue;

      const maxOffers = sizeNeed >= 3 ? 2 : 1;
      let remainingOffers = Math.min(maxOffers, candidates.length);
      for (const candidate of candidates) {
        if (remainingOffers <= 0) break;
        if (candidate.priorityScore < 14) continue;
        const offerKey = `${team.id}:${candidate.player.id}`;
        if (existingOfferKeys.has(offerKey)) continue;

        offers.push({
          playerId: candidate.player.id,
          teamId: team.id,
          offer: { ...candidate.openingOffer },
          source: "ai",
          createdAtDay: currentDay,
        });
        existingOfferKeys.add(offerKey);
        remainingOffers -= 1;
      }
    }

    return offers;
  }

  processOffseasonRenewals({ teams, activeTeamId, standingsTable, currentSeasonLabel, negotiationDate, currentDay, allPlayers, buildContext }) {
    const standingsIndex = createStandingsIndex(standingsTable);
    const notifications = [];

    for (const team of getManagedAiTeams(teams, activeTeamId)) {
      const plan = buildTeamPlan(team, standingsIndex.get(team.id), standingsTable, negotiationDate);
      const context = { ...buildContext(team), currentDate: negotiationDate, allPlayers };
      const candidates = buildOffseasonCandidates({
        contracts: this.#contracts,
        team,
        currentSeasonLabel,
        context,
        plan,
        currentDate: negotiationDate,
      });

      let remainingSlots = Math.min(OFFSEASON_RENEWAL_SLOTS_BY_STRATEGY[plan.strategy] || 5, candidates.length);
      for (const candidate of candidates) {
        if (remainingSlots <= 0) break;
        const result = runRenewalNegotiation({
          contracts: this.#contracts,
          team,
          candidate,
          context,
          plan,
        });
        if (result?.acceptedContract) {
          notifications.push(
            buildRenewalNotification({
              team,
              player: candidate.player,
              contract: result.acceptedContract,
              currentDay,
            }),
          );
        }
        if (result?.attempted) remainingSlots -= 1;
      }
    }

    return notifications;
  }

  processOffseasonFreeAgency({ teams, activeTeamId, standingsTable, freeAgents, negotiationDate, currentDay, allPlayers, buildContext }) {
    const standingsIndex = createStandingsIndex(standingsTable);
    const notifications = [];

    for (const team of getManagedAiTeams(teams, activeTeamId)) {
      const plan = buildTeamPlan(team, standingsIndex.get(team.id), standingsTable, negotiationDate);
      const remainingSlots = getOffseasonSigningSlots(team, plan);
      if (!remainingSlots) continue;

      const context = { ...buildContext(team), currentDate: negotiationDate, allPlayers };
      const candidates = buildOffseasonFreeAgentCandidates({
        contracts: this.#contracts,
        team,
        freeAgents,
        context,
        plan,
      });

      let signingsLeft = Math.min(remainingSlots, candidates.length);
      for (const candidate of candidates) {
        if (signingsLeft <= 0) break;
        const result = runFreeAgentNegotiation({
          contracts: this.#contracts,
          team,
          candidate,
          context,
          plan,
        });
        if (!result?.acceptedContract) continue;

        notifications.push(
          buildSigningNotification({
            team,
            player: candidate.player,
            contract: result.acceptedContract,
            currentDay,
          }),
        );
        signingsLeft -= 1;
      }
    }

    return notifications;
  }
}

const getManagedAiTeams = (teams, activeTeamId) =>
  (teams || []).filter((team) => team?.id && team.id !== activeTeamId);

const createStandingsIndex = (standingsTable) =>
  new Map((standingsTable || []).map((row, index) => [row.teamId, { ...row, rank: index + 1 }]));

const shouldRunMonthlyRenewals = (currentDate) => {
  const safeDate = new Date(currentDate);
  if (Number.isNaN(safeDate.getTime())) return false;
  const month = safeDate.getUTCMonth();
  return month >= 0 && month <= 2;
};
