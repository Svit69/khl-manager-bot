import { Team } from "../models/Team.js";
import { createLine } from "./lineFactory.js";
const seasonId="season-1";
export const createTeams=teamInfos=>teamInfos.map(info=>new Team(info,[
  createLine(info,1,1,seasonId),
  createLine(info,2,0.9,seasonId),
  createLine(info,3,0.8,seasonId),
  createLine(info,4,0.7,seasonId)
]));
