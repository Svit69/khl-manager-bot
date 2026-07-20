import { PlayerIdentity } from "../models/PlayerIdentity.js";
import { PlayerAttributes } from "../models/PlayerAttributes.js";
import { PlayerPotential } from "../models/PlayerPotential.js";
import { PlayerCondition } from "../models/PlayerCondition.js";
import { PlayerCareer } from "../models/PlayerCareer.js";
import { PlayerAffiliation } from "../models/PlayerAffiliation.js";
import { PlayerSeasonStats } from "../models/PlayerSeasonStats.js";
import { SkaterAttributes } from "../models/SkaterAttributes.js";
import { GoalieAttributes } from "../models/GoalieAttributes.js";
import { Skater } from "../models/Skater.js";
import { PlayerPosition } from "../models/PlayerPosition.js";
import { normalizeHiddenTraits } from "../models/HiddenPlayerTraits.js";

const isGoalieProfile = (profile, position) =>
  profile.identity?.isGoalie || profile.identity?.primaryPosition === PlayerPosition.G || position === PlayerPosition.G;

const createPlayerAttributesJson = (profile, position) => {
  if (isGoalieProfile(profile, position)) return new GoalieAttributes(profile.attributes).toJson();
  return new SkaterAttributes(profile.attributes).toJson();
};

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
  const attributesJson=createPlayerAttributesJson(profile,position);
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
  const affiliation=new PlayerAffiliation({
    playerId,
    teamId:profile.affiliation?.teamId??teamInfo?.id??null,
    contractId:profile.affiliation?.contractId||null,
    acquiredDay:profile.affiliation?.acquiredDay??null
  });
  const seasonStats=new PlayerSeasonStats({seasonId,playerId});
  const skater=new Skater(identity,attributes,potential,condition,career,affiliation,seasonStats,position);
  skater.hiddenTraits=normalizeHiddenTraits(profile.hiddenTraits);
  if(profile.externalCareer)skater.externalCareer={...profile.externalCareer};
  if(profile?.lineIndex)skater.expectedLineIndex=profile.lineIndex;
  return skater;
};
