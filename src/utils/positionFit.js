export const adjustedOvrForPosition=(player,slotPosition)=>{
  const baseOvr=player.currentOvr??player.ovr;
  if(!slotPosition)return baseOvr;
  const primary=player.identity.primaryPosition;
  const secondary=player.identity.secondaryPositions||[];
  if(slotPosition===primary)return baseOvr;
  if(secondary.includes(slotPosition))return Math.max(0,baseOvr-2);
  return Math.round(baseOvr*0.8);
};
export const lineupScoreForPosition=(player,slotPosition)=>adjustedOvrForPosition(player,slotPosition)*player.form;
