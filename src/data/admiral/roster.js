import { admiralDefenseRoster } from "./rosterDefense.js";
import { admiralForwardRoster } from "./rosterForwards.js";

export const admiralRoster = [...admiralForwardRoster, ...admiralDefenseRoster];
