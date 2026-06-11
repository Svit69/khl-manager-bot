import { clamp } from "../contracts/SeasonUtils.js";
import { getCoachFitLabel, getPlayerCoachPosition, getPlayerCoachStyleFit } from "./CoachStyleFitRules.js";

const avg = (items) => items.length ? items.reduce((sum, value) => sum + value, 0) / items.length : 0;
const groupFit = (items) => Math.round(avg(items.map((entry) => entry.fit)));

const buildEffect = (coach, fit, isPlayoff) => {
  const ratingBoost = ((coach?.overall || 72) - 74) / 620;
  const fitBoost = (fit.teamFit - 70) / 720;
  const playoffBoost = isPlayoff ? ((coach?.ratings?.playoffPoise || 70) - 70) / 950 : 0;
  return {
    attackMultiplier: clamp(1 + ratingBoost + fitBoost + ((coach?.ratings?.offense || 70) - 70) / 900, 0.94, 1.06),
    defenseMultiplier: clamp(1 + ratingBoost + fitBoost + ((coach?.ratings?.defense || 70) - 70) / 900 + playoffBoost, 0.94, 1.065),
    penaltyMultiplier: clamp(1 - ((coach?.ratings?.discipline || 70) - 70) / 360 - (fit.teamFit - 70) / 650, 0.86, 1.16),
    developmentMultiplier: clamp(1 + ((coach?.ratings?.playerDevelopment || 70) - 70) / 520 + (fit.teamFit - 70) / 900, 0.95, 1.08),
  };
};

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
      .filter((player) => getPlayerCoachPosition(player) !== "ВРТ")
      .map((player) => toEntry(coach, player))
      .sort((left, right) => right.ovr - left.ovr);
    const forwards = entries.filter((entry) => entry.position !== "ЗАЩ");
    const defenders = entries.filter((entry) => entry.position === "ЗАЩ");
    const fit = {
      teamFit: groupFit(entries),
      coreFit: groupFit(entries.slice(0, 8)),
      forwardFit: groupFit(forwards),
      defenseFit: groupFit(defenders),
    };
    return {
      ...fit,
      label: getCoachFitLabel(fit.teamFit),
      bestFits: entries.slice().sort((a, b) => b.fit - a.fit).slice(0, 4),
      poorFits: entries.slice().sort((a, b) => a.fit - b.fit).slice(0, 4),
      effect: buildEffect(coach, fit, context.isPlayoff),
    };
  }
}
