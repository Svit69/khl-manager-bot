import { ImportedPlayerProfileFactory } from '../contractImport/ImportedPlayerProfileFactory.js';
import { rosterExpansionPlayers } from './players/index.js';

const factory = new ImportedPlayerProfileFactory();
export const rosterExpansionProfiles = rosterExpansionPlayers.map(record => factory.createProfile(record));
