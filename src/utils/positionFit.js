export const adjustedOvrForPosition=(player,slotPosition)=>{
  if(!slotPosition)return player.ovr;
  const primary=player.identity.primaryPosition;
  const secondary=player.identity.secondaryPositions||[];
  if(slotPosition===primary)return player.ovr;
  if(secondary.includes(slotPosition))return Math.max(0,player.ovr-2);
  return Math.round(player.ovr*0.8);
};
export const lineupScoreForPosition=(player,slotPosition)=>adjustedOvrForPosition(player,slotPosition)*player.form;
