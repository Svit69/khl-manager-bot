import { AdmiralRosterBuilder } from "./AdmiralRosterBuilder.js";
import { admiralRoster } from "./roster.js";

const rosterBuilder = new AdmiralRosterBuilder();

export const admiralPlayerProfiles = rosterBuilder.buildPlayerProfiles(admiralRoster);
export const admiralPlayerContracts = rosterBuilder.buildPlayerContracts(admiralRoster);
