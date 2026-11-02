import { ImportedPlayerProfileFactory } from './ImportedPlayerProfileFactory.js';
import { importedPlayerRecords } from './players/index.js';

const factory = new ImportedPlayerProfileFactory();
export const importedPlayerProfiles = importedPlayerRecords.map(record => factory.createProfile(record));
