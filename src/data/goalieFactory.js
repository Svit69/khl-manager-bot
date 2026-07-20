import { PlayerAffiliation } from "../models/PlayerAffiliation.js";
import { PlayerAttributes } from "../models/PlayerAttributes.js";
import { PlayerCareer } from "../models/PlayerCareer.js";
import { PlayerCondition } from "../models/PlayerCondition.js";
import { PlayerIdentity } from "../models/PlayerIdentity.js";
import { PlayerPotential } from "../models/PlayerPotential.js";
import { PlayerSeasonStats } from "../models/PlayerSeasonStats.js";
import { Goalie } from "../models/Goalie.js";
import { GoalieAttributes } from "../models/GoalieAttributes.js";
import { normalizeHiddenTraits } from "../models/HiddenPlayerTraits.js";

export const createGoalie = (teamInfo, seasonId, profile) => {
  if (!profile) throw new Error(`Missing goalie profile for ${teamInfo?.name || "team"}`);
  const playerId = profile.id;
  const identity = new PlayerIdentity({ ...profile.identity, id: playerId });
  const attributes = new PlayerAttributes(playerId, new GoalieAttributes(profile.attributes).toJson());
  const potential = new PlayerPotential({ playerId, ...profile.potential });
  const condition = new PlayerCondition({ playerId, ...profile.condition });
  const career = new PlayerCareer({ playerId, ...profile.career });
  const affiliation = new PlayerAffiliation({
    playerId,
    teamId: profile.affiliation?.teamId ?? teamInfo?.id ?? null,
    contractId: profile.affiliation?.contractId || null,
    acquiredDay: profile.affiliation?.acquiredDay ?? null,
  });
  const goalie = new Goalie(identity, attributes, potential, condition, career, affiliation, new PlayerSeasonStats({ seasonId, playerId }));
  goalie.hiddenTraits = normalizeHiddenTraits(profile.hiddenTraits);
  if (profile?.lineIndex) goalie.expectedLineIndex = profile.lineIndex;
  return goalie;
};
