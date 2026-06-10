import { formatNextSeason, parseSeasonStart } from "./SeasonUtils.js";
const BASE_SEASON_START = 2025;
const CAP_BY_INDEX = [900000000, 950000000, 1000000000];
export class SalaryCapService {
  getCapRub(seasonLabel) {
    const index = Math.max(0, parseSeasonStart(seasonLabel) - BASE_SEASON_START);
    return CAP_BY_INDEX[index] || 1000000000 + (index - 2) * 100000000;
  }
  assessOffer({ contracts, teamId, playerId, startSeason, offer }) {
    const seasons = this.#buildOfferSeasons(startSeason, offer?.years);
    const failures = seasons
      .map((season) => this.#assessSeason({ contracts, teamId, playerId, season, salaryRub: offer?.salaryRub }))
      .filter((entry) => entry.projectedPayrollRub > entry.capRub);
    return { allowed: failures.length === 0, failures };
  }
  assessTrade({ contracts, userTeamId, aiTeamId, givePlayerIds, receivePlayerIds, seasonLabel }) {
    const outgoingIds = this.#contractAssetIds(givePlayerIds);
    const incomingIds = this.#contractAssetIds(receivePlayerIds);
    const playerIds = [...new Set([...outgoingIds, ...incomingIds])];
    const seasons = [...new Set((contracts || []).filter((contract) => playerIds.includes(contract.playerId) && parseSeasonStart(contract.season) >= parseSeasonStart(seasonLabel)).map((contract) => contract.season))];
    return [
      this.#assessTradeTeam({ contracts, teamId: userTeamId, outgoingIds, incomingIds, seasons }),
      this.#assessTradeTeam({ contracts, teamId: aiTeamId, outgoingIds: incomingIds, incomingIds: outgoingIds, seasons }),
    ].find((assessment) => !assessment.allowed) || { allowed: true, failures: [] };
  }
  #assessSeason({ contracts, teamId, playerId, season, salaryRub }) {
    return { teamId, season, capRub: this.getCapRub(season), projectedPayrollRub: this.#sumTeamContracts(contracts, teamId, season, playerId) + (Number(salaryRub) || 0) };
  }
  #assessTradeTeam({ contracts, teamId, outgoingIds, incomingIds, seasons }) {
    const failures = (seasons || [])
      .map((season) => {
        const payrollRub = this.#sumTeamContracts(contracts, teamId, season);
        const outgoingRub = this.#sumPlayerContracts(contracts, outgoingIds, season);
        const incomingRub = this.#sumPlayerContracts(contracts, incomingIds, season);
        return { teamId, season, capRub: this.getCapRub(season), projectedPayrollRub: payrollRub - outgoingRub + incomingRub };
      })
      .filter((entry) => entry.projectedPayrollRub > entry.capRub);
    return { allowed: failures.length === 0, failures };
  }
  #buildOfferSeasons(startSeason, years = 1) { let season = startSeason; return Array.from({ length: Math.max(1, Number(years) || 1) }, () => [season, season = formatNextSeason(season)][0]); }
  #sumTeamContracts(contracts, teamId, season, ignoredPlayerId = null) {
    return (contracts || []).filter((contract) => contract.teamId === teamId && contract.season === season && contract.playerId !== ignoredPlayerId).reduce((sum, contract) => sum + (Number(contract.salaryRub) || 0), 0);
  }
  #sumPlayerContracts(contracts, playerIds, season) {
    return (contracts || []).filter((contract) => (playerIds || []).includes(contract.playerId) && contract.season === season).reduce((sum, contract) => sum + (Number(contract.salaryRub) || 0), 0);
  }
  #contractAssetIds(ids) { return (ids || []).map((id) => String(id)).filter((id) => !id.startsWith("rights:")).map((id) => id.replace(/^player:/, "")); }
}
