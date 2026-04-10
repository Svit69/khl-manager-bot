import { generateUuid } from "../utils/uuid.js";
import { ContractType, contractTypeLabel } from "./ContractType.js";
import { createContractNormalizer } from "./ContractNormalization.js";
import { evaluateRenewalWillingness } from "./RenewalScoring.js";
import {
  calculateAge,
  clamp,
  formatContractEndDate,
  formatNextSeason,
  parseSeasonEnd,
  parseSeasonStart,
} from "./SeasonUtils.js";
import {
  getLatestContract,
  getSeasonLabelFromDate,
  isFutureSeason,
  roundSalaryRub,
} from "./ContractServiceShared.js";
import {
  buildFreeAgentRows,
  buildTeamContractRows,
  buildTeamStatisticsRows,
} from "./ContractServiceRows.js";
import { estimateMarketSalary } from "./ContractServiceMarket.js";
import {
  buildCounterOffer,
  getNegotiationDecision,
  isBlatantlyBadOffer,
} from "./ContractServiceNegotiation.js";

const { normalizeType, normalizeContract } = createContractNormalizer(ContractType);

export class ContractService {
  #contracts;
  #baseContracts;
  #baseContractIds;
  #releasedPlayerIds;
  #badOfferCounts;
  #lastOffers;

  constructor(contracts) {
    this.#baseContracts = (contracts || []).map(normalizeContract).filter(Boolean);
    this.#baseContractIds = new Set(this.#baseContracts.map((contract) => contract.id));
    this.#contracts = this.#baseContracts.map((contract) => ({ ...contract }));
    this.#releasedPlayerIds = new Set();
    this.#badOfferCounts = new Map();
    this.#lastOffers = new Map();
  }

  importContracts(payload) {
    const fullContracts = Array.isArray(payload?.contracts) ? payload.contracts : null;
    const savedContracts = Array.isArray(payload) ? payload : payload?.createdContracts || [];
    const releasedPlayerIds = Array.isArray(payload?.releasedPlayerIds) ? payload.releasedPlayerIds : [];
    const badOfferCounts = payload?.badOfferCounts && typeof payload.badOfferCounts === "object" ? payload.badOfferCounts : {};
    const lastOffers = payload?.lastOffers && typeof payload.lastOffers === "object" ? payload.lastOffers : {};
    const saved = (fullContracts || savedContracts || []).map(normalizeContract).filter(Boolean);

    this.#releasedPlayerIds = new Set(releasedPlayerIds);
    this.#badOfferCounts = new Map(
      Object.entries(badOfferCounts)
        .map(([playerId, count]) => [playerId, Number(count) || 0])
        .filter(([, count]) => count > 0),
    );
    this.#lastOffers = new Map(
      Object.entries(lastOffers)
        .map(([playerId, offer]) => [
          playerId,
          offer && typeof offer === "object"
            ? { years: clamp(Number(offer.years) || 1, 1, 4), salaryRub: roundSalaryRub(offer.salaryRub) }
            : null,
        ])
        .filter(([, offer]) => Boolean(offer)),
    );

    if (fullContracts) {
      this.#contracts = saved;
      return;
    }

    if (!saved.length) {
      this.#contracts = this.#baseContracts.map((contract) => ({ ...contract }));
      return;
    }

    const merged = new Map(this.#baseContracts.map((contract) => [contract.id, contract]));
    saved.forEach((contract) => {
      const base = merged.get(contract.id);
      if (!base) {
        merged.set(contract.id, contract);
        return;
      }

      merged.set(contract.id, {
        ...base,
        ...contract,
        playerId: base.playerId,
        teamId: base.teamId,
        season: base.season,
      });
    });

    this.#contracts = [...merged.values()];
  }

  exportContracts() {
    return {
      contracts: this.#contracts.map((contract) => ({ ...contract })),
      createdContracts: this.#contracts
        .filter((contract) => !this.#baseContractIds.has(contract.id))
        .map((contract) => ({ ...contract })),
      releasedPlayerIds: [...this.#releasedPlayerIds],
      badOfferCounts: Object.fromEntries(this.#badOfferCounts),
      lastOffers: Object.fromEntries(this.#lastOffers),
    };
  }

  releasePlayers(playerIds) {
    (playerIds || []).forEach((playerId) => {
      if (!playerId) return;
      this.#releasedPlayerIds.add(playerId);
      this.#contracts = this.#contracts.filter(
        (contract) => !(contract.playerId === playerId && !this.#baseContractIds.has(contract.id)),
      );
    });
  }

  reassignPlayerContracts(playerId, teamId) {
    if (!playerId || !teamId) return;
    this.#releasedPlayerIds.delete(playerId);
    this.#contracts = this.#contracts.map((contract) =>
      contract.playerId === playerId ? { ...contract, teamId } : contract,
    );
  }

  isRenewalLocked(playerId, currentDate = null) {
    const currentSeason = getSeasonLabelFromDate(currentDate);
    return this.#contracts.some(
      (contract) =>
        contract.playerId === playerId &&
        !this.#baseContractIds.has(contract.id) &&
        isFutureSeason(contract.season, currentSeason, parseSeasonStart),
    );
  }

  getRenewalLockReason(playerId, currentDate = null) {
    if (!this.isRenewalLocked(playerId, currentDate)) return null;
    return "\u041a\u043e\u043d\u0442\u0440\u0430\u043a\u0442 \u0443\u0436\u0435 \u043f\u0440\u043e\u0434\u043b\u0435\u043d \u043d\u0430 \u0431\u0443\u0434\u0443\u0449\u0438\u0439 \u0441\u0435\u0437\u043e\u043d";
  }

  getContractsForPlayer(playerId) {
    return this.#contracts
      .filter(
        (contract) =>
          contract.playerId === playerId &&
          (!this.#releasedPlayerIds.has(playerId) || !this.#baseContractIds.has(contract.id)),
      )
      .sort((left, right) => parseSeasonEnd(left.season) - parseSeasonEnd(right.season));
  }

  getContractForSeason(playerId, season) {
    return this.getContractsForPlayer(playerId).find((contract) => contract.season === season) || null;
  }

  getTeamContractRows(team, currentDate = null) {
    return buildTeamContractRows({
      team,
      currentDate,
      parseSeasonEnd,
      formatContractEndDate,
      resolvePlayerContracts: (playerId, linkedContractId) => this.#resolvePlayerContracts(playerId, linkedContractId),
      isRenewalLocked: (playerId, date) => this.isRenewalLocked(playerId, date),
      getRenewalLockReason: (playerId, date) => this.getRenewalLockReason(playerId, date),
    });
  }

  getTeamStatisticsRows(team, context = null, sortBy = "points") {
    return buildTeamStatisticsRows({ team, sortBy, context });
  }

  getContractTypeLabel(type) {
    return contractTypeLabel[normalizeType(type)];
  }

  getSigningStartSeason(currentDate = null) {
    const seasonFromDate = getSeasonLabelFromDate(currentDate);
    if (seasonFromDate) return seasonFromDate;
    const seasons = this.#contracts.map((contract) => contract.season).filter(Boolean);
    const minSeason = seasons.sort((left, right) => parseSeasonEnd(left) - parseSeasonEnd(right))[0];
    return minSeason || "2025/2026";
  }

  getRenewalPreview(team, player, offer, context = null) {
    return this.#buildNegotiationPreview({
      team,
      player,
      offer,
      context,
      isFreeAgent: false,
    });
  }

  submitRenewalOffer(team, player, offer, context = null) {
    const preview = this.getRenewalPreview(team, player, offer, context);
    if (preview.isRenewalLocked) {
      return { decision: "locked", preview };
    }

    const decision = getNegotiationDecision(preview, player);
    if (decision === "accept") {
      const contracts = this.getContractsForPlayer(player.id);
      const lastContract = contracts[contracts.length - 1];
      if (!lastContract) return { decision: "reject", preview };

      const newContracts = this.#createFutureContracts({
        player,
        teamId: player.affiliation.teamId,
        years: preview.offer.years,
        salaryRub: preview.offer.salaryRub,
        startSeason: formatNextSeason(lastContract.season),
        type: lastContract.type,
      });

      this.#clearBadOfferCount(player.id);
      this.#clearLastOffer(player.id);
      return { decision: "accept", preview, newContracts };
    }

    this.#handleRejectedNegotiation(player.id, preview);
    return { decision, preview, counter: buildCounterOffer(preview) };
  }

  getFreeAgentRows(players, currentDate = null) {
    return buildFreeAgentRows(players, currentDate);
  }

  getFreeAgentPreview(team, player, offer, context = null) {
    return this.#buildNegotiationPreview({
      team,
      player,
      offer,
      context,
      isFreeAgent: true,
    });
  }

  submitFreeAgentOffer(team, player, offer, context = null) {
    const preview = this.getFreeAgentPreview(team, player, offer, context);
    const decision = getNegotiationDecision(preview, player);

    if (decision === "accept") {
      const newContracts = this.finalizeFreeAgentSigning(team, player, preview.offer, context);
      return { decision: "accept", preview, newContracts };
    }

    this.#handleRejectedNegotiation(player.id, preview);
    return { decision, preview, counter: buildCounterOffer(preview) };
  }

  finalizeFreeAgentSigning(team, player, offer, context = null) {
    const normalizedOffer = {
      years: clamp(Number(offer?.years) || 1, 1, 4),
      salaryRub: roundSalaryRub(offer?.salaryRub),
    };
    const newContracts = this.#createFutureContracts({
      player,
      teamId: team.id,
      years: normalizedOffer.years,
      salaryRub: normalizedOffer.salaryRub,
      startSeason: this.getSigningStartSeason(context?.currentDate),
      type: ContractType.ONE_WAY,
    });

    player.affiliation.teamId = team.id;
    this.#releasedPlayerIds.delete(player.id);
    player.potential?.resetFreeAgentInactivity?.();
    this.#clearBadOfferCount(player.id);
    this.#clearLastOffer(player.id);
    return newContracts;
  }

  extendContract(player, mode) {
    const playerId = player.id;
    if (this.isRenewalLocked(playerId)) return null;

    const contracts = this.getContractsForPlayer(playerId);
    const lastContract = contracts[contracts.length - 1];
    if (!lastContract) return null;

    const nextContract = {
      id: generateUuid(),
      playerId,
      teamId: player.affiliation.teamId,
      season: formatNextSeason(lastContract.season),
      salaryRub: roundSalaryRub(lastContract.salaryRub * (mode === "raise" ? 1.1 : 1)),
      type: lastContract.type,
    };

    this.#contracts.push(nextContract);
    player.affiliation.contractId = nextContract.id;
    return nextContract;
  }

  #buildNegotiationPreview({ team, player, offer, context, isFreeAgent }) {
    const contracts = this.getContractsForPlayer(player.id);
    const lastContract = contracts[contracts.length - 1] || null;
    const market = estimateMarketSalary({
      player,
      context,
      lastContract,
      getReferenceSalary: (playerId) => this.#getReferenceSalary(playerId),
    });
    const evaluation = evaluateRenewalWillingness({
      player,
      team,
      offer,
      context: {
        ...(context || {}),
        isFreeAgent,
        badOfferCount: this.#getBadOfferCount(player.id),
        lastOffer: this.#getLastOffer(player.id),
      },
      lastContract,
      marketSalary: market.salaryRub,
    });
    const renewalLocked = isFreeAgent ? false : this.isRenewalLocked(player.id, context?.currentDate);

    return {
      playerId: player.id,
      ...evaluation,
      marketSampleSize: market.sampleSize,
      marketRangeLabel: market.rangeLabel,
      isRenewalLocked: renewalLocked,
      renewalLockReason: renewalLocked ? this.getRenewalLockReason(player.id, context?.currentDate) : null,
    };
  }

  #createFutureContracts({ player, teamId, years, salaryRub, startSeason, type }) {
    let season = startSeason;
    const newContracts = [];

    for (let index = 0; index < years; index++) {
      const contract = {
        id: generateUuid(),
        playerId: player.id,
        teamId,
        season,
        salaryRub: roundSalaryRub(salaryRub),
        type,
      };
      this.#contracts.push(contract);
      newContracts.push(contract);
      player.affiliation.contractId = contract.id;
      season = formatNextSeason(season);
    }

    return newContracts;
  }

  #handleRejectedNegotiation(playerId, preview) {
    if (isBlatantlyBadOffer(preview)) {
      this.#registerBadOffer(playerId);
    }
    this.#rememberLastOffer(playerId, preview.offer);
  }

  #resolvePlayerContracts(playerId, linkedContractId) {
    let contracts = this.getContractsForPlayer(playerId);
    if (contracts.length || !linkedContractId) return contracts;
    const linked = this.#contracts.find((contract) => contract.id === linkedContractId);
    if (!linked) return contracts;
    contracts = linked.playerId ? this.getContractsForPlayer(linked.playerId) : [linked];
    if (!contracts.length) contracts = [linked];
    return contracts;
  }

  #getReferenceSalary(playerId) {
    const contracts = this.getContractsForPlayer(playerId);
    const latest = getLatestContract(contracts, (contract) => parseSeasonEnd(contract.season));
    return latest?.salaryRub || null;
  }

  #getBadOfferCount(playerId) {
    return this.#badOfferCounts.get(playerId) || 0;
  }

  #clearBadOfferCount(playerId) {
    this.#badOfferCounts.delete(playerId);
  }

  #registerBadOffer(playerId) {
    this.#badOfferCounts.set(playerId, this.#getBadOfferCount(playerId) + 1);
  }

  #getLastOffer(playerId) {
    return this.#lastOffers.get(playerId) || null;
  }

  #clearLastOffer(playerId) {
    this.#lastOffers.delete(playerId);
  }

  #rememberLastOffer(playerId, offer) {
    if (!playerId || !offer) return;
    this.#lastOffers.set(playerId, {
      years: clamp(Number(offer.years) || 1, 1, 4),
      salaryRub: roundSalaryRub(offer.salaryRub),
    });
  }
}
