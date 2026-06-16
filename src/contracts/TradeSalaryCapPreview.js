import { parseSeasonStart } from "./SeasonUtils.js";

const normalizePlayerIds = (ids = []) =>
  ids.map((id) => String(id)).filter((id) => !id.startsWith("rights:")).map((id) => id.replace(/^player:/, ""));

const sumContracts = (contracts = [], teamId, season, playerIds = null) =>
  contracts
    .filter((contract) => contract.teamId === teamId && contract.season === season)
    .filter((contract) => !playerIds || playerIds.includes(contract.playerId))
    .reduce((sum, contract) => sum + (Number(contract.salaryRub) || 0), 0);

const sumPlayerContracts = (contracts = [], playerIds = [], season) =>
  contracts
    .filter((contract) => playerIds.includes(contract.playerId) && contract.season === season)
    .reduce((sum, contract) => sum + (Number(contract.salaryRub) || 0), 0);

const pickWorstSeason = (rows = []) =>
  rows.sort((left, right) => left.projectedRemainingRub - right.projectedRemainingRub)[0] || null;

const isTradeRowAllowed = (row) =>
  row.projectedPayrollRub <= row.capRub || (row.payrollRub > row.capRub && row.projectedPayrollRub < row.payrollRub);

const buildTeamPreview = ({ contracts, teamId, outgoingIds, incomingIds, seasons, getCapRub }) => {
  const rows = seasons.map((season) => {
    const payrollRub = sumContracts(contracts, teamId, season);
    const outgoingRub = sumPlayerContracts(contracts, outgoingIds, season);
    const incomingRub = sumPlayerContracts(contracts, incomingIds, season);
    const projectedPayrollRub = payrollRub - outgoingRub + incomingRub;
    const capRub = getCapRub(season);
    const row = { season, capRub, payrollRub, outgoingRub, incomingRub, projectedPayrollRub, deltaRub: incomingRub - outgoingRub, remainingRub: capRub - payrollRub, projectedRemainingRub: capRub - projectedPayrollRub };
    return { ...row, allowed: isTradeRowAllowed(row), reliefTrade: payrollRub > capRub && projectedPayrollRub < payrollRub };
  });
  const worst = pickWorstSeason([...rows]);
  return { rows, worst, allowed: rows.every((row) => row.allowed) };
};

export const buildTradeSalaryCapPreview = ({ contracts = [], userTeamId, aiTeamId, givePlayerIds = [], receivePlayerIds = [], seasonLabel, getCapRub }) => {
  const outgoingIds = normalizePlayerIds(givePlayerIds);
  const incomingIds = normalizePlayerIds(receivePlayerIds);
  const selectedIds = [...new Set([...outgoingIds, ...incomingIds])];
  const seasonStart = parseSeasonStart(seasonLabel);
  const seasons = [...new Set(contracts
    .filter((contract) => selectedIds.includes(contract.playerId) && parseSeasonStart(contract.season) >= seasonStart)
    .map((contract) => contract.season))];
  const safeSeasons = seasons.length ? seasons : [seasonLabel];
  const user = buildTeamPreview({ contracts, teamId: userTeamId, outgoingIds, incomingIds, seasons: safeSeasons, getCapRub });
  const ai = buildTeamPreview({ contracts, teamId: aiTeamId, outgoingIds: incomingIds, incomingIds: outgoingIds, seasons: safeSeasons, getCapRub });
  return { enabled: true, seasonLabel, user, ai, allowed: user.allowed && ai.allowed };
};
