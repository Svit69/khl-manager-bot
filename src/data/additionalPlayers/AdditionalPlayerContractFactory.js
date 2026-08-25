import {
  additionalPlayerContractTypeByLabel,
  additionalPlayerSeasonByIndex,
  additionalPlayerTeamIds,
} from "./additionalPlayerConstants.js";

const convertMillionsToRubles = (millions) => Math.round(Number(millions) * 1000000);

export const createAdditionalPlayerContracts = (record) => record.salaries
  .map((salary, seasonIndex) => ({ salary, season: additionalPlayerSeasonByIndex[seasonIndex] }))
  .filter(({ salary }) => salary !== null && salary !== undefined && salary !== "")
  .map(({ salary, season }) => ({
    id: `added-contract-${record.photo}-${season.slice(0, 4)}`,
    playerId: `added-player-${record.photo}`,
    teamId: additionalPlayerTeamIds[record.team],
    season,
    salaryRub: convertMillionsToRubles(salary),
    type: additionalPlayerContractTypeByLabel[record.contractType] || "one-way",
  }));
