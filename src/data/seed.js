import { Skater } from "../models/Skater.js";
import { Line } from "../models/Line.js";
import { Team } from "../models/Team.js";
const attrs=()=>({speed:r(60,85),shot:r(60,85),pass:r(60,85),defense:r(60,85)});
const r=(a,b)=>Math.floor(Math.random()*(b-a+1))+a;
const makeLine=(team,idx,weight)=>{
  const base=`${team} Л${idx}`;
  return new Line([
    new Skater(`${base} Ц`,attrs(),"C"),
    new Skater(`${base} ЛК`,attrs(),"LW"),
    new Skater(`${base} ПК`,attrs(),"RW")
  ],weight);
};
export const createTeams=names=>names.map(n=>new Team(n,[
  makeLine(n,1,1),makeLine(n,2,0.9),makeLine(n,3,0.8),makeLine(n,4,0.7)
]));
