import { KhlExternalRightsBuilder } from "./KhlExternalRightsBuilder.js";
import { ahlRightsRecords } from "./ahlRightsRecords.js";
import { nhlRightsRecords } from "./nhlRightsRecords.js";

const rightsBuilder = new KhlExternalRightsBuilder();
const externalRightsRecords = [...ahlRightsRecords, ...nhlRightsRecords];

export const externalRightsProfiles = rightsBuilder.buildPlayerProfiles(externalRightsRecords);
