import { teamsData } from "../teams.js";

const teamIdByShortName = new Map(teamsData.map((team) => [team.shortName, team.id]));

const convertMillionsToRubles = (millions) => Math.round(Number(millions) * 1000000);

const createReportContractId = (record) => `report-contract-${record.playerId}-${record.season.slice(0, 4)}`;

const createContractFromOverride = (record) => ({
  id: createReportContractId(record),
  playerId: record.playerId,
  teamId: teamIdByShortName.get(record.teamShortName) || null,
  season: record.season,
  salaryRub: convertMillionsToRubles(record.salaryMillions),
  type: record.type,
});

export const applyRosterReportContractOverrides = (contracts, overrides) => {
  const mergedContracts = contracts.map((contract) => ({ ...contract }));
  overrides.forEach((record) => {
    const existingContract = mergedContracts.find((contract) => contract.playerId === record.playerId && contract.season === record.season);
    if (existingContract) {
      existingContract.teamId = teamIdByShortName.get(record.teamShortName) || existingContract.teamId;
      existingContract.salaryRub = convertMillionsToRubles(record.salaryMillions);
      existingContract.type = record.type;
      return;
    }
    mergedContracts.push(createContractFromOverride(record));
  });
  return mergedContracts;
};
