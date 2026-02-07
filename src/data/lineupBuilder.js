import { Line } from "../models/Line.js";
import { PlayerPosition } from "../models/PlayerPosition.js";
import { lineupScoreForPosition } from "../utils/positionFit.js";
const LINE_WEIGHTS=[1,0.9,0.8,0.7];
const LINE_POSITIONS=[PlayerPosition.LW,PlayerPosition.CTR,PlayerPosition.RW,PlayerPosition.DEF,PlayerPosition.DEF];
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
  const lines=LINE_WEIGHTS.map(weight=>{
    const players=[];
    LINE_POSITIONS.forEach(position=>{
      if(!pool.length)return;
      const idx=takeBestPlayer(pool,position);
      players.push(pool.splice(idx,1)[0]);
    });
    return new Line(players,weight,[...LINE_POSITIONS]);
  });
  return {lines,reservePlayers:pool};
};
