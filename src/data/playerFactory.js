import { PlayerIdentity } from "../models/PlayerIdentity.js";
import { PlayerAttributes } from "../models/PlayerAttributes.js";
import { PlayerPotential } from "../models/PlayerPotential.js";
import { PlayerCondition } from "../models/PlayerCondition.js";
import { PlayerCareer } from "../models/PlayerCareer.js";
import { PlayerAffiliation } from "../models/PlayerAffiliation.js";
import { PlayerSeasonStats } from "../models/PlayerSeasonStats.js";
import { SkaterAttributes } from "../models/SkaterAttributes.js";
import { Skater } from "../models/Skater.js";
import { generateUuid } from "../utils/uuid.js";
import { randomInt, randomFloat, randomBirthDate } from "../utils/random.js";
export const createSkater=(teamInfo,firstName,lastName,position,seasonId)=>{
  const playerId=generateUuid();
  const identity=new PlayerIdentity({
    id:playerId,firstName,lastName,displayName:`${firstName} ${lastName}`,
    birthDate:randomBirthDate(),nationality:"RU",isGoalie:false,photoUrl:null
  });
  const attributesJson=new SkaterAttributes(createSkaterAttributes()).toJson();
  const attributes=new PlayerAttributes(playerId,attributesJson);
  const potential=new PlayerPotential({
    playerId,potential:randomInt(70,95),growthRate:randomFloat(0.8,1.2),
    peakAge:randomInt(25,30),declineRate:randomFloat(0.85,0.98)
  });
  const condition=new PlayerCondition({playerId,fatigueScore:randomInt(0,10),form:randomFloat(0.98,1.02)});
  const career=new PlayerCareer({playerId,khlGamesPlayed:0,seasonsPlayed:0,reputation:0});
  const affiliation=new PlayerAffiliation({playerId,teamId:teamInfo.id,contractId:null});
  const seasonStats=new PlayerSeasonStats({seasonId,playerId});
  return new Skater(identity,attributes,potential,condition,career,affiliation,seasonStats,position);
};
const createSkaterAttributes=()=>({
  shot:randomInt(60,85),speed:randomInt(60,85),physical:randomInt(60,85),
  defense:randomInt(60,85),skill:randomInt(60,85)
});
