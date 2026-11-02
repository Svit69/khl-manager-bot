import { readFile } from 'node:fs/promises';
import { requestedRosterPlayers } from '../src/data/rosterExpansion/RequestedRosterPlayers.js';
import { RosterExpansionBuilder, normalizePlayerName } from './contracts/RosterExpansionBuilder.mjs';
import { RosterExpansionReportWriter } from './contracts/RosterExpansionReportWriter.mjs';
import { ImportRecordWriter } from './contracts/ImportRecordWriter.mjs';
import { normalizeRosterResearch } from './contracts/RosterResearchNormalizer.mjs';
import { applyRosterResearchCorrections } from './contracts/RosterResearchCorrections.mjs';

const research = [];
for (const group of ['a', 'b', 'c', 'd', 'e', 'f']) {
  const document = JSON.parse(await readFile(`reports/scouting-research-group-${group}.json`, 'utf8'));
  research.push(...(Array.isArray(document) ? document : document.players).map(normalizeRosterResearch).map(applyRosterResearchCorrections));
}
const builder = new RosterExpansionBuilder();
const entries = requestedRosterPlayers.map(request => builder.createPlayerAndContract(request,
  research.find(record => normalizePlayerName(record.name) === normalizePlayerName(request.name))));
if (new Set(entries.map(entry => entry.player.id)).size !== entries.length) throw new Error('Duplicate roster expansion players');
const writer = new ImportRecordWriter();
await writer.writeModules('src/data/rosterExpansion/players', 'RosterExpansionPlayers', 'rosterExpansionPlayers', entries.map(entry => entry.player));
await writer.writeModules('src/data/rosterExpansion/contracts', 'RosterExpansionContracts', 'rosterExpansionContracts', entries.map(entry => entry.contract));
await new RosterExpansionReportWriter().writeReport(entries);
console.log(JSON.stringify({ players: entries.length, contracts: entries.reduce((sum, entry) => sum + entry.contract.salaries.length, 0) }));
