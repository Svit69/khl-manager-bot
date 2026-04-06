import { generateUuid } from "../utils/uuid.js";
import { ContractType, contractTypeLabel } from "./ContractType.js";
import { createContractNormalizer } from "./ContractNormalization.js";
import { evaluateRenewalWillingness, getAcceptanceChance } from "./RenewalScoring.js";
import { calculateAge, clamp, formatContractEndDate, formatNextSeason, parseSeasonEnd } from "./SeasonUtils.js";

const { normalizeType, normalizeContract } = createContractNormalizer(ContractType);
const roundSalaryRub = (value) => Math.max(500000, Math.round((Number(value) || 0) / 500000) * 500000);

const getPositionMarketGroup = (position) => {
  if (position === "ЗАЩ") return "DEF";
  if (position === "ВРТ") return "G";
  return "FWD";
};

const getLatestContract = (contracts) =>
  contracts.reduce((latest, current) => {
    if (!latest) return current;
    return parseSeasonEnd(current.season) >= parseSeasonEnd(latest.season) ? current : latest;
  }, null);

const getMoodTone = (state) => {
  if (state === "green") return "positive";
  if (state === "yellow") return "neutral";
  return "negative";
};

const getMoodLabel = (state) => {
  if (state === "green") return "\u041e\u0442\u043b\u0438\u0447\u043d\u043e\u0435";
  if (state === "yellow") return "\u0421\u0442\u0430\u0431\u0438\u043b\u044c\u043d\u043e\u0435";
  if (state === "orange") return "\u041d\u0430\u043f\u0440\u044f\u0436\u0435\u043d\u043d\u043e\u0435";
  return "\u041f\u043b\u043e\u0445\u043e\u0435";
};

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
    const savedContracts = Array.isArray(payload) ? payload : payload?.createdContracts || [];
    const releasedPlayerIds = Array.isArray(payload?.releasedPlayerIds) ? payload.releasedPlayerIds : [];
    const badOfferCounts = payload?.badOfferCounts && typeof payload.badOfferCounts === "object" ? payload.badOfferCounts : {};
    const lastOffers = payload?.lastOffers && typeof payload.lastOffers === "object" ? payload.lastOffers : {};
    const saved = (savedContracts || []).map(normalizeContract).filter(Boolean);
    this.#releasedPlayerIds = new Set(releasedPlayerIds);
    this.#badOfferCounts = new Map(Object.entries(badOfferCounts).map(([playerId, count]) => [playerId, Number(count) || 0]).filter(([, count]) => count > 0));
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

    if (!saved.length) {
      this.#contracts = this.#baseContracts.map((contract) => ({ ...contract }));
      return;
    }

    const merged = new Map(this.#baseContracts.map((contract) => [contract.id, contract]));
    saved.forEach((contract) => {
      const base = merged.get(contract.id);
      if (base) {
        merged.set(contract.id, {
          ...base,
          ...contract,
          playerId: base.playerId,
          teamId: base.teamId,
          season: base.season,
        });
        return;
      }
      merged.set(contract.id, contract);
    });

    this.#contracts = [...merged.values()];
  }

  exportContracts() {
    return {
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

  isRenewalLocked(playerId) {
    return this.#contracts.some((contract) => contract.playerId === playerId && !this.#baseContractIds.has(contract.id));
  }

  getRenewalLockReason(playerId) {
    if (!this.isRenewalLocked(playerId)) return null;
    return "Контракт уже продлен в этом сезоне";
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

  getTeamContractRows(team) {
    return team
      .getRoster()
      .map((player) => {
        const playerId = player.id || null;
        if (!playerId) {
          return {
            playerId: null,
            displayName: player.name,
            age: calculateAge(player.identity.birthDate),
            ovr: player.currentOvr ?? player.ovr,
            position: player.identity?.primaryPosition || "",
            khlGamesPlayed: player.career?.khlGamesPlayed || 0,
            seasonStats: {
              games: player.seasonStats.games,
              goals: player.seasonStats.goals,
              assists: player.seasonStats.assists,
            },
            contractEndDate: null,
            contracts: [],
          };
        }

        const contracts = this.#resolvePlayerContracts(playerId, player.affiliation.contractId);
        const lastContract = getLatestContract(contracts);
        const isRenewalLocked = this.isRenewalLocked(playerId);

        return {
          playerId,
          displayName: player.name,
          age: calculateAge(player.identity.birthDate),
          ovr: player.currentOvr ?? player.ovr,
          position: player.identity?.primaryPosition || "",
          khlGamesPlayed: player.career?.khlGamesPlayed || 0,
          seasonStats: {
            games: player.seasonStats.games,
            goals: player.seasonStats.goals,
            assists: player.seasonStats.assists,
          },
          contractEndDate: formatContractEndDate(lastContract?.season),
          contracts,
          isRenewalLocked,
          renewalLockReason: isRenewalLocked ? this.getRenewalLockReason(playerId) : null,
        };
      })
      .sort((left, right) => left.displayName.localeCompare(right.displayName, "ru"));
  }

  getTeamStatisticsRows(team, context = null, sortBy = "points") {
    const rows = team
      .getRoster()
      .map((player) => ({
        playerId: player.id,
        displayName: player.name,
        position: player.identity?.primaryPosition || "",
        ovr: player.currentOvr ?? player.ovr,
        games: player.seasonStats?.games || 0,
        points: player.seasonStats?.points || 0,
        goals: player.seasonStats?.goals || 0,
        assists: player.seasonStats?.assists || 0,
        penaltyMinutes: player.seasonStats?.penaltyMinutes || 0,
        totalIceTime: player.seasonStats?.totalIceTime || 0,
        mood: {
          score: player.moodScore,
          state: player.moodState,
          label: getMoodLabel(player.moodState),
          tone: getMoodTone(player.moodState),
        },
      }));

    const compareBySort = (left, right) => {
      if (sortBy === "goals") {
        return (right.goals - left.goals) ||
          (right.points - left.points) ||
          (right.assists - left.assists);
      }
      if (sortBy === "iceTime") {
        const leftAverageIceTime = left.games ? left.totalIceTime / left.games : 0;
        const rightAverageIceTime = right.games ? right.totalIceTime / right.games : 0;
        return (rightAverageIceTime - leftAverageIceTime) ||
          (right.points - left.points) ||
          (right.goals - left.goals);
      }
      if (sortBy === "penaltyMinutes") {
        return (right.penaltyMinutes - left.penaltyMinutes) ||
          (right.games - left.games) ||
          (right.points - left.points);
      }
      return (right.points - left.points) ||
        (right.goals - left.goals) ||
        (right.assists - left.assists);
    };

    return rows.sort((left, right) =>
      compareBySort(left, right) ||
      (right.ovr - left.ovr) ||
      left.displayName.localeCompare(right.displayName, "ru"),
    );
  }

  getContractTypeLabel(type) {
    return contractTypeLabel[normalizeType(type)];
  }

  getSigningStartSeason() {
    const seasons = this.#contracts.map((contract) => contract.season).filter(Boolean);
    const minSeason = seasons.sort((left, right) => parseSeasonEnd(left) - parseSeasonEnd(right))[0];
    return minSeason || "2025/2026";
  }

  getRenewalPreview(team, player, offer, context = null) {
    const contracts = this.getContractsForPlayer(player.id);
    const lastContract = contracts[contracts.length - 1] || null;
    const market = this.#estimateMarketSalary(player, context, lastContract);
    const evaluation = evaluateRenewalWillingness({
      player,
      team,
      offer,
      context: { ...(context || {}), badOfferCount: this.#getBadOfferCount(player.id), lastOffer: this.#getLastOffer(player.id) },
      lastContract,
      marketSalary: market.salaryRub,
    });
    const isRenewalLocked = this.isRenewalLocked(player.id);

    return {
      playerId: player.id,
      ...evaluation,
      marketSampleSize: market.sampleSize,
      marketRangeLabel: market.rangeLabel,
      isRenewalLocked,
      renewalLockReason: isRenewalLocked ? this.getRenewalLockReason(player.id) : null,
    };
  }

  submitRenewalOffer(team, player, offer, context = null) {
    const preview = this.getRenewalPreview(team, player, offer, context);
    if (preview.isRenewalLocked) {
      return { decision: "locked", preview };
    }

    const decision = this.#getNegotiationDecision(preview, player);

    if (decision === "accept") {
      const contracts = this.getContractsForPlayer(player.id);
      const lastContract = contracts[contracts.length - 1];
      if (!lastContract) return { decision: "reject", preview };

      let season = lastContract.season;
      const newContracts = [];
      for (let index = 0; index < preview.offer.years; index++) {
        season = formatNextSeason(season);
        const nextContract = {
          id: generateUuid(),
          playerId: player.id,
          teamId: player.affiliation.teamId,
          season,
          salaryRub: roundSalaryRub(preview.offer.salaryRub),
          type: lastContract.type,
        };
        this.#contracts.push(nextContract);
        newContracts.push(nextContract);
        player.affiliation.contractId = nextContract.id;
      }
      this.#clearBadOfferCount(player.id);
      this.#clearLastOffer(player.id);
      return { decision: "accept", preview, newContracts };
    }

    if (this.#isBlatantlyBadOffer(preview)) {
      this.#registerBadOffer(player.id);
    }
    this.#rememberLastOffer(player.id, preview.offer);

    return { decision, preview, counter: this.#buildCounterOffer(preview) };
  }

  getFreeAgentRows(players) {
    return (players || [])
      .map((player) => ({
        playerId: player.id,
        displayName: player.name,
        age: calculateAge(player.identity.birthDate),
        ovr: player.ovr,
        position: player.identity?.primaryPosition || "",
        khlGamesPlayed: player.career?.khlGamesPlayed || 0,
        seasonStats: {
          games: player.seasonStats.games,
          goals: player.seasonStats.goals,
          assists: player.seasonStats.assists,
        },
        contractEndDate: null,
        contracts: [],
      }))
      .sort((left, right) => right.ovr - left.ovr || left.displayName.localeCompare(right.displayName, "ru"));
  }

  getFreeAgentPreview(team, player, offer, context = null) {
    const market = this.#estimateMarketSalary(player, context, null);
    return {
      playerId: player.id,
      ...evaluateRenewalWillingness({
        player,
        team,
        offer,
        context: { ...(context || {}), isFreeAgent: true, badOfferCount: this.#getBadOfferCount(player.id), lastOffer: this.#getLastOffer(player.id) },
        lastContract: null,
        marketSalary: market.salaryRub,
      }),
      marketSampleSize: market.sampleSize,
      marketRangeLabel: market.rangeLabel,
      isRenewalLocked: false,
      renewalLockReason: null,
    };
  }

  submitFreeAgentOffer(team, player, offer, context = null) {
    const preview = this.getFreeAgentPreview(team, player, offer, context);
    const decision = this.#getNegotiationDecision(preview, player);

    if (decision === "accept") {
      let season = this.getSigningStartSeason();
      const newContracts = [];
      for (let index = 0; index < preview.offer.years; index++) {
        const contract = {
          id: generateUuid(),
          playerId: player.id,
          teamId: team.id,
          season,
          salaryRub: roundSalaryRub(preview.offer.salaryRub),
          type: ContractType.ONE_WAY,
        };
        this.#contracts.push(contract);
        newContracts.push(contract);
        player.affiliation.contractId = contract.id;
        player.affiliation.teamId = team.id;
        this.#releasedPlayerIds.delete(player.id);
        season = formatNextSeason(season);
      }
      this.#clearBadOfferCount(player.id);
      this.#clearLastOffer(player.id);
      return { decision: "accept", preview, newContracts };
    }

    if (this.#isBlatantlyBadOffer(preview)) {
      this.#registerBadOffer(player.id);
    }
    this.#rememberLastOffer(player.id, preview.offer);

    return { decision, preview, counter: this.#buildCounterOffer(preview) };
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

  #resolvePlayerContracts(playerId, linkedContractId) {
    let contracts = this.getContractsForPlayer(playerId);
    if (contracts.length || !linkedContractId) return contracts;
    const linked = this.#contracts.find((contract) => contract.id === linkedContractId);
    if (!linked) return contracts;
    contracts = linked.playerId ? this.getContractsForPlayer(linked.playerId) : [linked];
    if (!contracts.length) contracts = [linked];
    return contracts;
  }

  #estimateMarketSalary(player, context, lastContract) {
    const allPlayers = Array.isArray(context?.allPlayers) ? context.allPlayers : [];
    const minOvr = (player.ovr || 0) - 1;
    const maxOvr = (player.ovr || 0) + 1;
    const marketGroup = getPositionMarketGroup(player.identity?.primaryPosition);

    const peers = allPlayers.filter(
      (candidate) =>
        candidate?.id !== player.id &&
        Math.abs((candidate?.ovr || 0) - (player.ovr || 0)) <= 1 &&
        getPositionMarketGroup(candidate?.identity?.primaryPosition) === marketGroup,
    );
    const peerSalaries = peers
      .map((candidate) => this.#getReferenceSalary(candidate.id))
      .filter((salary) => Number.isFinite(salary) && salary > 0);
    const marketModifier = this.#getSeasonMarketModifier(player, peers, context);

    if (peerSalaries.length) {
      const averageSalary = peerSalaries.reduce((total, value) => total + value, 0) / peerSalaries.length;
      return {
        salaryRub: roundSalaryRub(Math.max(1000000, averageSalary * marketModifier)),
        sampleSize: peerSalaries.length,
        rangeLabel: `${this.#getMarketGroupLabel(marketGroup)} - OVR ${minOvr}-${maxOvr}`,
      };
    }

    const fallbackBase = lastContract?.salaryRub || Math.max(1000000, Math.round((player.ovr || 0) * 1000000));
    return {
      salaryRub: roundSalaryRub(fallbackBase * marketModifier),
      sampleSize: 0,
      rangeLabel: `${this.#getMarketGroupLabel(marketGroup)} - OVR ${minOvr}-${maxOvr}`,
    };
  }

  #getReferenceSalary(playerId) {
    const contracts = this.getContractsForPlayer(playerId);
    const latest = getLatestContract(contracts);
    return latest?.salaryRub || null;
  }

  #getMarketGroupLabel(group) {
    if (group === "DEF") return "Защитники";
    if (group === "G") return "Вратари";
    return "Нападающие";
  }

  #buildCounterOffer(preview) {
    const wantsMoreMoney = preview.salaryRatio < 0.98 || preview.salaryScore < 6;
    const wantsDifferentTerm = (preview.termMod || 0) < 0;

    let years = clamp(preview.offer.years, 1, 4);
    let salaryRub = roundSalaryRub(preview.offer.salaryRub);

    if (wantsDifferentTerm) {
      if (preview.termPreference === "short") years = Math.min(years, 2);
      else if (preview.termPreference === "neutral") years = 3;
      else years = 4;
    }

    if (wantsMoreMoney) {
      const targetFactor = preview.salaryRatio < 0.85 ? 1.08 : preview.salaryRatio < 1 ? 1.03 : 1.01;
      const targetSalary = roundSalaryRub(preview.teamAdjustedDemand * targetFactor);
      salaryRub = Math.max(salaryRub, targetSalary);
    }

    if (years === preview.offer.years && salaryRub === preview.offer.salaryRub) {
      salaryRub = roundSalaryRub(Math.max(preview.offer.salaryRub, preview.teamAdjustedDemand));
    }

    if (wantsMoreMoney && wantsDifferentTerm) {
      return { years, salaryRub, style: "both", summary: "Игрок хочет изменить и срок, и зарплату" };
    }
    if (wantsMoreMoney) {
      return { years, salaryRub, style: "salary", summary: "Игрок готов обсуждать контракт, но просит больше денег" };
    }
    if (wantsDifferentTerm) {
      return { years, salaryRub, style: "term", summary: "Игроку не нравится срок и он просит другую структуру контракта" };
    }

    return { years, salaryRub, style: "close", summary: "Игрок близок к согласию, но хочет чуть лучшее предложение" };
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

  #getSeasonMarketModifier(player, peers, context) {
    const gamesPlayed = Number(player?.seasonStats?.games) || 0;
    const teamGamesPlayed = Number(context?.teamGamesPlayed) || 0;
    if (gamesPlayed < 5 || teamGamesPlayed < 5 || !peers.length) {
      return 1;
    }

    const progressFactor = clamp(teamGamesPlayed / 40, 0.15, 1);
    const comparablePeers = peers.filter((candidate) => (candidate?.seasonStats?.games || 0) >= 5);
    if (!comparablePeers.length) {
      return 1;
    }

    const average = (values) => (values.length ? values.reduce((total, value) => total + value, 0) / values.length : 0);
    const playerPointsPerGame = this.#getPointsPerGame(player);
    const playerShotsPerGame = this.#getShotsPerGame(player);
    const playerIceMinutes = this.#getIceMinutesPerGame(player);
    const ppgGap = playerPointsPerGame - average(comparablePeers.map((candidate) => this.#getPointsPerGame(candidate)));
    const shotsGap = playerShotsPerGame - average(comparablePeers.map((candidate) => this.#getShotsPerGame(candidate)));
    const iceGap = playerIceMinutes - average(comparablePeers.map((candidate) => this.#getIceMinutesPerGame(candidate)));

    let premium = 0;
    premium += clamp(ppgGap * 0.2, -0.08, 0.12);
    premium += clamp(shotsGap * 0.03, -0.03, 0.04);
    premium += clamp(iceGap * 0.01, -0.02, 0.03);

    return 1 + clamp(premium * progressFactor, -0.1, 0.15);
  }

  #getPointsPerGame(player) {
    const games = Math.max(1, Number(player?.seasonStats?.games) || 0);
    const points =
      Number(player?.seasonStats?.points) ||
      (Number(player?.seasonStats?.goals) || 0) + (Number(player?.seasonStats?.assists) || 0);
    return points / games;
  }

  #getShotsPerGame(player) {
    const games = Math.max(1, Number(player?.seasonStats?.games) || 0);
    return (Number(player?.seasonStats?.shots) || 0) / games;
  }

  #getIceMinutesPerGame(player) {
    const games = Math.max(1, Number(player?.seasonStats?.games) || 0);
    return ((Number(player?.seasonStats?.totalIceTime) || 0) / 60) / games;
  }

  #isBlatantlyBadOffer(preview) {
    const salaryRatio = Number(preview?.salaryRatio) || 0;
    const termMod = Number(preview?.termMod) || 0;
    const roleScore = Number(preview?.roleScore) || 0;
    return salaryRatio < 0.75 || (salaryRatio < 0.85 && termMod < 0 && roleScore < -3);
  }

  #getNegotiationDecision(preview, player) {
    const willingness = Number(preview?.willingness) || 0;
    const chance = getAcceptanceChance(willingness);
    const isStar = (player?.ovr || 0) >= 82;
    const isElite = (player?.ovr || 0) >= 84;
    const salaryRatio = Number(preview?.salaryRatio) || 0;
    const roleScore = Number(preview?.roleScore) || 0;
    const termMod = Number(preview?.termMod) || 0;
    const ufaStatus = preview?.ufaStatus;

    if (ufaStatus === "NSA" && willingness < 45) {
      return "reject";
    }
    if (willingness < 25) {
      return ufaStatus === "OSA" ? "counter" : "reject";
    }
    if (isStar && salaryRatio < 0.9) {
      return willingness >= 35 ? "counter" : ufaStatus === "OSA" ? "counter" : "reject";
    }
    if (isElite && termMod < 0 && roleScore < 0) {
      return "counter";
    }

    const acceptRoll = Math.random() * 100 < chance;
    if (acceptRoll && willingness >= 35) {
      return "accept";
    }

    if (willingness < 35) {
      return ufaStatus === "OSA" ? "counter" : "reject";
    }
    if (willingness < 60) {
      return "counter";
    }
    return "counter";
  }
}
