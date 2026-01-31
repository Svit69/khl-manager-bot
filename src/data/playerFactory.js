import { PlayerIdentity } from "../models/PlayerIdentity.js";
import { PlayerAttributes } from "../models/PlayerAttributes.js";
import { PlayerPotential } from "../models/PlayerPotential.js";
import { PlayerCondition } from "../models/PlayerCondition.js";
import { PlayerCareer } from "../models/PlayerCareer.js";
import { PlayerAffiliation } from "../models/PlayerAffiliation.js";
import { PlayerSeasonStats } from "../models/PlayerSeasonStats.js";
import { SkaterAttributes } from "../models/SkaterAttributes.js";
import { Skater } from "../models/Skater.js";
import { PlayerPosition } from "../models/PlayerPosition.js";
import { generateUuid } from "../utils/uuid.js";
import { randomInt, randomFloat, randomBirthDate } from "../utils/random.js";
const createSkaterAttributes=()=>({
  shot:randomInt(60,85),speed:randomInt(60,85),physical:randomInt(60,85),defense:randomInt(60,85),skill:randomInt(60,85)
});
export const createSkater=(teamInfo,firstName,lastName,position,seasonId,profile=null)=>{
  const playerId=profile?.id||generateUuid();
  const identity=new PlayerIdentity({
    id:playerId,firstName:profile?.identity?.firstName||firstName,lastName:profile?.identity?.lastName||lastName,
    displayName:profile?.identity?.displayName||`${firstName} ${lastName}`,
    birthDate:profile?.identity?.birthDate||randomBirthDate(),nationality:profile?.identity?.nationality||"RU",
    isGoalie:profile?.identity?.isGoalie||false,photoUrl:profile?.identity?.photoUrl||null,
    primaryPosition:profile?.identity?.primaryPosition||position,
    secondaryPositions:profile?.identity?.secondaryPositions||[]
  });
  const attributesJson=new SkaterAttributes(profile?.attributes||createSkaterAttributes()).toJson();
  const attributes=new PlayerAttributes(playerId,attributesJson);
  const potential=new PlayerPotential({
    playerId,potential:profile?.potential?.potential||randomInt(70,95),growthRate:profile?.potential?.growthRate||randomFloat(0.8,1.2),
    peakAge:profile?.potential?.peakAge||randomInt(25,30),declineRate:profile?.potential?.declineRate||randomFloat(0.85,0.98)
  });
  const condition=new PlayerCondition({
    playerId,fatigueScore:profile?.condition?.fatigueScore||randomInt(0,10),form:profile?.condition?.form||randomFloat(0.98,1.02),
    injuryUntilDay:profile?.condition?.injuryUntilDay||null
  });
  const career=new PlayerCareer({
    playerId,khlGamesPlayed:profile?.career?.khlGamesPlayed||0,seasonsPlayed:profile?.career?.seasonsPlayed||0,
    reputation:profile?.career?.reputation||0
  });
  const affiliation=new PlayerAffiliation({playerId,teamId:teamInfo.id,contractId:profile?.affiliation?.contractId||null});
  const seasonStats=new PlayerSeasonStats({seasonId,playerId});
  return new Skater(identity,attributes,potential,condition,career,affiliation,seasonStats,position);
};
