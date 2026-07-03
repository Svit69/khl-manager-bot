import { AmurRosterBuilder } from "./AmurRosterBuilder.js";
import { amurRoster } from "./roster.js";

const rosterBuilder = new AmurRosterBuilder();

export const amurPlayerProfiles = rosterBuilder.buildPlayerProfiles(amurRoster);
export const amurPlayerContracts = rosterBuilder.buildPlayerContracts(amurRoster);
