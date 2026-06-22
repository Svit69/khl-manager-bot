import { buildCoachTeamEffect } from "./CoachEffectMath.js";
import { getCoachFitLabel, getPlayerCoachPosition, getPlayerCoachStyleFit } from "./CoachStyleFitRules.js";

const GOALIE_POSITION = "ВРТ", DEFENDER_POSITION = "ЗАЩ";
const avg = (items) => items.length ? items.reduce((sum, value) => sum + value, 0) / items.length : 0;
const groupFit = (items) => Math.round(avg(items.map((entry) => entry.fit)));

const toEntry = (coach, player) => ({
  playerId: player.id,
  playerName: player.name,
  position: getPlayerCoachPosition(player),
  ovr: player.ovr,
  fit: getPlayerCoachStyleFit(coach, player),
});

export class CoachFitService {
  evaluateTeam(coach, team, context = {}) {
    if (!coach || !team?.getRoster) return null;
    const entries = team.getRoster()
      .filter((player) => getPlayerCoachPosition(player) !== GOALIE_POSITION)
      .map((player) => toEntry(coach, player))
      .sort((left, right) => right.ovr - left.ovr);
    const forwards = entries.filter((entry) => entry.position !== DEFENDER_POSITION);
    const defenders = entries.filter((entry) => entry.position === DEFENDER_POSITION);
    const fit = {
      teamFit: groupFit(entries),
      coreFit: groupFit(entries.slice(0, 8)),
      forwardFit: groupFit(forwards),
      defenseFit: groupFit(defenders),
    };
    return {
      ...fit, label: getCoachFitLabel(fit.teamFit),
      bestFits: entries.slice().sort((a, b) => b.fit - a.fit).slice(0, 4),
      poorFits: entries.slice().sort((a, b) => a.fit - b.fit).slice(0, 4),
      effect: buildCoachTeamEffect(coach, fit, context.isPlayoff),
    };
  }
}
