import { teamsData } from '../teams.js';
import { rosterExpansionContracts } from './contracts/index.js';

export const createRosterExpansionContracts = () => rosterExpansionContracts.flatMap(record => record.salaries.map(([season, salaryMillions]) => ({
  id: `import-contract-${record.playerId}-${season.slice(0, 4)}`,
  playerId: record.playerId,
  teamId: teamsData.find(team => team.shortName === record.team)?.id,
  season, salaryRub: Math.round(salaryMillions * 1e6), type: record.type,
})));
