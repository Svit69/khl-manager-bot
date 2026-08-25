import { createAdditionalPlayerContracts } from "./AdditionalPlayerContractFactory.js";
import { createAdditionalPlayerProfile } from "./AdditionalPlayerProfileFactory.js";
import { additionalPlayerRecordsA } from "./AdditionalPlayerRecordsA.js";
import { additionalPlayerRecordsB } from "./AdditionalPlayerRecordsB.js";

const additionalPlayerRecords = [...additionalPlayerRecordsA, ...additionalPlayerRecordsB];

export const additionalPlayerProfiles = additionalPlayerRecords.map(createAdditionalPlayerProfile);
export const additionalPlayerContracts = additionalPlayerRecords.flatMap(createAdditionalPlayerContracts);
