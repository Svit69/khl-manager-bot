import { LadaRosterBuilder } from "./LadaRosterBuilder.js";
import { ladaRoster } from "./roster.js";

const rosterBuilder = new LadaRosterBuilder();

export const ladaPlayerProfiles = rosterBuilder.buildPlayerProfiles(ladaRoster);
export const ladaPlayerContracts = rosterBuilder.buildPlayerContracts(ladaRoster);
