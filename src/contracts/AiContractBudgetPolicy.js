import { TEAM_ROSTER_POSITION_TARGETS, TEAM_ROSTER_TARGET_SIZE } from "../season/RosterTargets.js";
import { PlayerPosition } from "../models/PlayerPosition.js";

const MINIMUM_SLOT_RESERVE_RUB = 500000;

const getPositionGroup = (player) => {
  const position = player?.identity?.primaryPosition;
  if (position === PlayerPosition.G) return "G";
  if (position === PlayerPosition.DEF) return "DEF";
  return "FWD";
};

const getMaximumPlayerCapShare = (player, mode) => {
  const ovr = Number(player?.ovr) || 65;
  const group = getPositionGroup(player);
  let share = ovr >= 90 ? 0.16 : ovr >= 87 ? 0.145 : ovr >= 84 ? 0.12 : ovr >= 80 ? 0.095 : ovr >= 76 ? 0.075 : ovr >= 72 ? 0.055 : 0.04;
  if (group === "G") share -= 0.015;
  if (mode === "renewal" && ovr >= 82) share += 0.015;
  return Math.max(0.035, Math.min(0.18, share));
};

const countRosterGroups = (team, playerId) =>
  (team?.getRoster?.() || []).reduce((counts, player) => {
    if (player?.id === playerId) return counts;
    const group = getPositionGroup(player);
    counts[group] = (counts[group] || 0) + 1;
    return counts;
  }, { FWD: 0, DEF: 0, G: 0 });

const getOpenRosterSlotCount = (team, player) => {
  const counts = countRosterGroups(team, player?.id);
  const signedGroup = getPositionGroup(player);
  counts[signedGroup] = (counts[signedGroup] || 0) + 1;
  const positionMissing = Object.entries(TEAM_ROSTER_POSITION_TARGETS)
    .reduce((sum, [group, target]) => sum + Math.max(0, target - (counts[group] || 0)), 0);
  const rosterSize = (team?.getRoster?.() || []).filter((entry) => entry?.id !== player?.id).length + 1;
  return Math.max(positionMissing, TEAM_ROSTER_TARGET_SIZE - rosterSize, 0);
};

export class AiContractBudgetPolicy {
  canSubmitOffer({ team, player, offer, mode, capRub, remainingRub }) {
    if (!team?.id || !player?.id || !offer || !capRub) return false;
    const salaryRub = Number(offer.salaryRub) || 0;
    if (salaryRub > capRub * getMaximumPlayerCapShare(player, mode)) return false;
    const openSlots = getOpenRosterSlotCount(team, player);
    const reserveRub = openSlots * MINIMUM_SLOT_RESERVE_RUB;
    return Number(remainingRub) - salaryRub >= reserveRub;
  }
}
