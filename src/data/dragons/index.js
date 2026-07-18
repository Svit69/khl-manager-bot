import { DragonsRosterBuilder } from "./DragonsRosterBuilder.js";
import { dragonsRoster } from "./roster.js";

const rosterBuilder = new DragonsRosterBuilder();

export const dragonsPlayerProfiles = rosterBuilder.buildPlayerProfiles(dragonsRoster);
export const dragonsPlayerContracts = rosterBuilder.buildPlayerContracts(dragonsRoster);
