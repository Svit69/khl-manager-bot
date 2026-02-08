import { Team } from "../models/Team.js";
import { createSkater } from "./playerFactory.js";
import { getTeamProfiles } from "./players.js";
import { buildCompetitiveLines } from "./lineupBuilder.js";
const seasonId="season-1";
export const createTeams=teamInfos=>teamInfos.map(info=>{
  const profiles=getTeamProfiles(info.id);
  const roster=profiles.map(p=>createSkater(info,p.identity.firstName,p.identity.lastName,p.position,seasonId,p));
  const lineup=buildCompetitiveLines(roster);
  return new Team(info,lineup.lines,lineup.reservePlayers);
});
