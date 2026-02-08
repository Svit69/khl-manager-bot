import { Line } from "../models/Line.js";
import { PlayerPosition } from "../models/PlayerPosition.js";
import { lineupScoreForPosition } from "../utils/positionFit.js";
const LINE_SCHEMAS=[
  {weight:1,positions:[PlayerPosition.LW,PlayerPosition.CTR,PlayerPosition.RW,PlayerPosition.DEF,PlayerPosition.DEF]},
  {weight:0.9,positions:[PlayerPosition.LW,PlayerPosition.CTR,PlayerPosition.RW,PlayerPosition.DEF,PlayerPosition.DEF]},
  {weight:0.8,positions:[PlayerPosition.LW,PlayerPosition.CTR,PlayerPosition.RW,PlayerPosition.DEF,PlayerPosition.DEF]},
  {weight:0.7,positions:[PlayerPosition.LW,PlayerPosition.CTR,PlayerPosition.RW,PlayerPosition.DEF]}
];
const takeBestPlayer=(players,slotPosition)=>{
  let bestIndex=-1,bestScore=-Infinity;
  players.forEach((player,index)=>{
    const score=lineupScoreForPosition(player,slotPosition);
    if(score>bestScore){bestScore=score;bestIndex=index}
  });
  return bestIndex;
};
export const buildCompetitiveLines=roster=>{
  const pool=[...roster];
  const lines=LINE_SCHEMAS.map(schema=>{
    const players=[];
    schema.positions.forEach(position=>{
      if(!pool.length)return;
      const idx=takeBestPlayer(pool,position);
      players.push(pool.splice(idx,1)[0]);
    });
    return new Line(players,schema.weight,[...schema.positions]);
  });
  return {lines,reservePlayers:pool};
};
