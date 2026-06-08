import { NeftekhimikRosterBuilder } from "./NeftekhimikRosterBuilder.js";
import { neftekhimikRoster } from "./roster.js";

const rosterBuilder = new NeftekhimikRosterBuilder();

export const neftekhimikPlayerProfiles = rosterBuilder.buildPlayerProfiles(neftekhimikRoster);
export const neftekhimikPlayerContracts = rosterBuilder.buildPlayerContracts(neftekhimikRoster);
