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

export class ContractService {
  #contracts;
  #baseContracts;
  #baseContractIds;
  #releasedPlayerIds;

  constructor(contracts) {
    this.#baseContracts = (contracts || []).map(normalizeContract).filter(Boolean);
    this.#baseContractIds = new Set(this.#baseContracts.map((contract) => contract.id));
    this.#contracts = this.#baseContracts.map((contract) => ({ ...contract }));
    this.#releasedPlayerIds = new Set();
  }

  importContracts(payload) {
    const savedContracts = Array.isArray(payload) ? payload : payload?.createdContracts || [];
    const releasedPlayerIds = Array.isArray(payload?.releasedPlayerIds) ? payload.releasedPlayerIds : [];
    const saved = (savedContracts || []).map(normalizeContract).filter(Boolean);
    this.#releasedPlayerIds = new Set(releasedPlayerIds);

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
          };
        }

        const contracts = this.#resolvePlayerContracts(playerId, player.affiliation.contractId);
        const lastContract = getLatestContract(contracts);
        const isRenewalLocked = this.isRenewalLocked(playerId);

        return {
          playerId,
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
          contractEndDate: formatContractEndDate(lastContract?.season),
          contracts,
          isRenewalLocked,
          renewalLockReason: isRenewalLocked ? this.getRenewalLockReason(playerId) : null,
        };
      })
      .sort((left, right) => left.displayName.localeCompare(right.displayName, "ru"));
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
      context,
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
      return { decision: "accept", preview, newContracts };
    }

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
        context: { ...(context || {}), isFreeAgent: true },
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
      return { decision: "accept", preview, newContracts };
    }

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

    const peerSalaries = allPlayers
      .filter(
        (candidate) =>
          candidate?.id !== player.id &&
          Math.abs((candidate?.ovr || 0) - (player.ovr || 0)) <= 1 &&
          getPositionMarketGroup(candidate?.identity?.primaryPosition) === marketGroup,
      )
      .map((candidate) => this.#getReferenceSalary(candidate.id))
      .filter((salary) => Number.isFinite(salary) && salary > 0);

    if (peerSalaries.length) {
      const averageSalary = peerSalaries.reduce((total, value) => total + value, 0) / peerSalaries.length;
      return {
        salaryRub: roundSalaryRub(Math.max(1000000, Math.round(averageSalary / 100000) * 100000)),
        sampleSize: peerSalaries.length,
        rangeLabel: `${this.#getMarketGroupLabel(marketGroup)} • OVR ${minOvr}-${maxOvr}`,
      };
    }

    return {
      salaryRub: roundSalaryRub(lastContract?.salaryRub || Math.max(1000000, Math.round((player.ovr || 0) * 1000000))),
      sampleSize: 0,
      rangeLabel: `${this.#getMarketGroupLabel(marketGroup)} • OVR ${minOvr}-${maxOvr}`,
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

    return { years, salaryRub };
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
