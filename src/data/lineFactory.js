import { createSkater } from "./playerFactory.js";
import { findPlayerProfile } from "./players.js";
import { Line } from "../models/Line.js";
const withProfile=(teamInfo,index,position)=>findPlayerProfile(teamInfo.id,index,position);
export const createLine=(teamInfo,index,weight,seasonId)=>{
  const base=`${teamInfo.name} Л${index}`;
  return new Line([
    createSkater(teamInfo,`${base} Ц`,`Ц${index}`,"C",seasonId,withProfile(teamInfo,index,"C")),
    createSkater(teamInfo,`${base} ЛК`,`ЛК${index}`,"LW",seasonId,withProfile(teamInfo,index,"LW")),
    createSkater(teamInfo,`${base} ПК`,`ПК${index}`,"RW",seasonId,withProfile(teamInfo,index,"RW"))
  ],weight);
};
