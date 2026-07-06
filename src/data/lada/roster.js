import { ladaDefenseRoster } from "./rosterDefense.js";
import { ladaForwardRoster } from "./rosterForwards.js";

export const ladaRoster = [...ladaForwardRoster, ...ladaDefenseRoster];
