import { teamsData } from '../teams.js';
import { importedContractRecords } from './records/index.js';
import { createRosterExpansionContracts } from '../rosterExpansion/RosterExpansionContracts.js';

export const applyImportedContracts = (contracts) => {
  const replacements = new Set(importedContractRecords.map(record => record.playerId));
  const retained = contracts.filter(contract => !replacements.has(contract.playerId));
  const imported = importedContractRecords.flatMap(record => record.salaries.map(([season, salaryMillions]) => ({
    id: contracts.find(contract => contract.playerId === record.playerId && contract.season === season)?.id
      || `import-contract-${record.playerId}-${season.slice(0, 4)}`,
    playerId: record.playerId,
    teamId: teamsData.find(team => team.shortName === record.team)?.id || null,
    season, salaryRub: Math.round(salaryMillions * 1e6), type: record.type,
  })));
  return [...retained, ...imported, ...createRosterExpansionContracts()];
};
