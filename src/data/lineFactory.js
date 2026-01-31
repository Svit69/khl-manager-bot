import { Line } from "../models/Line.js";
import { createSkater } from "./playerFactory.js";
export const createLine=(teamInfo,index,weight,seasonId)=>{
  const base=`${teamInfo.name} Л${index}`;
  return new Line([
    createSkater(teamInfo,`${base} Ц`,`Ц${index}`,"C",seasonId),
    createSkater(teamInfo,`${base} ЛК`,`ЛК${index}`,"LW",seasonId),
    createSkater(teamInfo,`${base} ПК`,`ПК${index}`,"RW",seasonId)
  ],weight);
};
