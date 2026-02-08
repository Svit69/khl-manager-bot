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
export const createSkater=(teamInfo,firstName,lastName,position,seasonId,profile=null)=>{
  if(!profile)throw new Error(`Missing player profile for ${teamInfo?.name||"team"}`);
  const playerId=profile.id;
  const identity=new PlayerIdentity({
    id:playerId,
    firstName:profile.identity.firstName||firstName,
    lastName:profile.identity.lastName||lastName,
    displayName:profile.identity.displayName||`${firstName} ${lastName}`,
    birthDate:profile.identity.birthDate,
    nationality:profile.identity.nationality,
    isGoalie:profile.identity.isGoalie||false,
    photoUrl:profile.identity.photoUrl||null,
    primaryPosition:profile.identity.primaryPosition||position,
    secondaryPositions:profile.identity.secondaryPositions||[]
  });
  const attributesJson=new SkaterAttributes(profile.attributes).toJson();
  const attributes=new PlayerAttributes(playerId,attributesJson);
  const potential=new PlayerPotential({
    playerId,
    potential:profile.potential.potential,
    growthRate:profile.potential.growthRate,
    peakAge:profile.potential.peakAge,
    declineRate:profile.potential.declineRate
  });
  const condition=new PlayerCondition({
    playerId,
    fatigueScore:profile.condition.fatigueScore,
    form:profile.condition.form,
    injuryUntilDay:profile.condition.injuryUntilDay||null
  });
  const career=new PlayerCareer({
    playerId,
    khlGamesPlayed:profile.career.khlGamesPlayed,
    seasonsPlayed:profile.career.seasonsPlayed,
    reputation:profile.career.reputation||0
  });
  const affiliation=new PlayerAffiliation({playerId,teamId:teamInfo.id,contractId:profile.affiliation?.contractId||null});
  const seasonStats=new PlayerSeasonStats({seasonId,playerId});
  return new Skater(identity,attributes,potential,condition,career,affiliation,seasonStats,position);
};
