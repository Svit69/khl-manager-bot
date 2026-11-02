import { createTeams } from '../../src/data/seed.js';
import { createFreeAgents } from '../../src/data/freeAgents.js';
import { createExternalPlayers } from '../../src/data/externalPlayers.js';
import { teamsData } from '../../src/data/teams.js';
import { playerContracts } from '../../src/data/contracts.js';
import { transferUpdateRecords } from '../../src/data/transfers/TransferUpdateRecords.js';
import { TransferUpdateService } from '../../src/data/transfers/TransferUpdateService.js';
import { CsvDocumentReader } from './CsvDocumentReader.mjs';

export const createContractImportFixture = () => {
  const teams = createTeams(teamsData), freeAgents = createFreeAgents(), externalPlayers = createExternalPlayers();
  const contracts = structuredClone(playerContracts);
  new TransferUpdateService(transferUpdateRecords).applyTransferUpdates({ teams, freeAgents, externalPlayers, contracts });
  const active = teams.flatMap(team => team.getRoster().map(player => ({ player, team })));
  const all = [...active.map(entry => entry.player), ...freeAgents, ...externalPlayers];
  return { teams, freeAgents, externalPlayers, contracts, active, all,
    rows: new CsvDocumentReader().readRows('reports/contract-import-source.csv') };
};
