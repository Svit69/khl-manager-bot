import { Team } from "../models/Team.js";
import { createLine } from "./lineFactory.js";
import { createSkater } from "./playerFactory.js";
import { getTeamProfiles } from "./players.js";
const seasonId="season-1";
export const createTeams=teamInfos=>teamInfos.map(info=>{
  const lines=[
    createLine(info,1,1,seasonId),
    createLine(info,2,0.9,seasonId),
    createLine(info,3,0.8,seasonId),
    createLine(info,4,0.7,seasonId)
  ];
  const usedIds=new Set(lines.flatMap(l=>l.players).map(p=>p.identity.id));
  const reserveProfiles=getTeamProfiles(info.id).filter(p=>!usedIds.has(p.id));
  const reservePlayers=reserveProfiles.map(p=>createSkater(
    info,
    p.identity.firstName,
    p.identity.lastName,
    p.position,
    seasonId,
    p
  ));
  return new Team(info,lines,reservePlayers);
});
