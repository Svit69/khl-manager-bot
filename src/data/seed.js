import { Skater } from "../models/Skater.js";
import { Line } from "../models/Line.js";
import { Team } from "../models/Team.js";
export const createTeams=teamInfos=>teamInfos.map(info=>new Team(info,[
  createLine(info.name,1,1),
  createLine(info.name,2,0.9),
  createLine(info.name,3,0.8),
  createLine(info.name,4,0.7)
]));
const createLine=(teamName,index,weight)=>{
  const base=`${teamName} Л${index}`;
  return new Line([
    new Skater(`${base} Ц`,createAttributes(),"C"),
    new Skater(`${base} ЛК`,createAttributes(),"LW"),
    new Skater(`${base} ПК`,createAttributes(),"RW")
  ],weight);
};
const createAttributes=()=>({
  speed:randomInt(60,85),
  shot:randomInt(60,85),
  pass:randomInt(60,85),
  defense:randomInt(60,85)
});
const randomInt=(min,max)=>Math.floor(Math.random()*(max-min+1))+min;
