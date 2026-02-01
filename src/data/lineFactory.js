import { createSkater } from "./playerFactory.js";
import { findPlayerProfile } from "./players.js";
import { Line } from "../models/Line.js";
import { PlayerPosition } from "../models/PlayerPosition.js";
const withProfile=(teamInfo,index,position)=>findPlayerProfile(teamInfo.id,index,position);
export const createLine=(teamInfo,index,weight,seasonId)=>{
  const base=`${teamInfo.name} Л${index}`;
  return new Line([
    createSkater(teamInfo,`${base} Ц`,`Ц${index}`,PlayerPosition.CTR,seasonId,withProfile(teamInfo,index,PlayerPosition.CTR)),
    createSkater(teamInfo,`${base} ЛК`,`ЛК${index}`,PlayerPosition.LW,seasonId,withProfile(teamInfo,index,PlayerPosition.LW)),
    createSkater(teamInfo,`${base} ПК`,`ПК${index}`,PlayerPosition.RW,seasonId,withProfile(teamInfo,index,PlayerPosition.RW)),
    createSkater(teamInfo,`${base} З1`,`З1${index}`,PlayerPosition.DEF,seasonId,withProfile(teamInfo,index,PlayerPosition.DEF)),
    createSkater(teamInfo,`${base} З2`,`З2${index}`,PlayerPosition.DEF,seasonId,withProfile(teamInfo,index,PlayerPosition.DEF))
  ],weight);
};
