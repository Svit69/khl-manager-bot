import { SochiRosterBuilder } from "./SochiRosterBuilder.js";
import { sochiRoster } from "./roster.js";

const rosterBuilder = new SochiRosterBuilder();

export const sochiPlayerProfiles = rosterBuilder.buildPlayerProfiles(sochiRoster);
export const sochiPlayerContracts = rosterBuilder.buildPlayerContracts(sochiRoster);
