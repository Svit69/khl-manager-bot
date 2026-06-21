import { calculateAge } from "../contracts/SeasonUtils.js";
import { HiddenPlayerTrait, hasHiddenTrait } from "../models/HiddenPlayerTraits.js";

const RESERVE_FATIGUE_RECOVERY = -11.25;
const FATIGUE_ACCUMULATION_FACTOR = 0.576;

export const applyMatchPlayerStats = (match) => {
  const applySide = (teamSummary, team) => {
    const rosterById = new Map((team?.getRoster?.() || []).map((player) => [player.id, player]));
    (teamSummary?.playerStats || []).forEach((stat) => {
      const player = rosterById.get(stat.playerId);
      if (player) player.seasonStats.applyMatch(stat);
    });
  };

  applySide(match?.summary?.home, match?.home);
  applySide(match?.summary?.away, match?.away);
};

export const applyMatchMood = (team, teamSummary) => {
  const roster = team?.getRoster?.() || [];
  if (!roster.length) return;

  const statsById = new Map((teamSummary?.playerStats || []).map((stat) => [stat.playerId, stat]));
  const playedByGroup = new Map();

  roster
    .filter((player) => statsById.has(player.id))
    .forEach((player) => {
      const group = getPositionMoodGroup(player.identity?.primaryPosition);
      if (!playedByGroup.has(group)) playedByGroup.set(group, []);
      playedByGroup.get(group).push(player);
    });

  roster.forEach((player) => {
    const stat = statsById.get(player.id);
    if (stat) {
      const iceMinutes = (Number(stat.totalIceTime) || 0) / 60;
      let moodDelta = 1.1;
      if (iceMinutes >= 18) moodDelta += 0.9;
      else if (iceMinutes >= 12) moodDelta += 0.5;
      else if (iceMinutes < 8) moodDelta -= 0.2;
      if (player.moodState === "red" || player.moodState === "orange") moodDelta += 0.35;
      player.applyMoodDelta(moodDelta);
      return;
    }

    const groupPlayers = playedByGroup.get(getPositionMoodGroup(player.identity?.primaryPosition)) || [];
    const age = calculateAge(player.identity?.birthDate);
    const sensitivity = age <= 19 ? 0.25 : age <= 22 ? 0.55 : 1;

    if (!groupPlayers.length) {
      player.applyMoodDelta(-0.35 * sensitivity);
      return;
    }

    const averageActiveOvr =
      groupPlayers.reduce((total, activePlayer) => total + (activePlayer.ovr || 0), 0) / groupPlayers.length;
    const strongerThanSomeone = groupPlayers.some((activePlayer) => (player.ovr || 0) > (activePlayer.ovr || 0));

    let moodDelta = -0.75;
    if (strongerThanSomeone && (player.ovr || 0) >= averageActiveOvr + 1) moodDelta = -3.2;
    else if ((player.ovr || 0) >= averageActiveOvr - 1) moodDelta = -1.6;
    else if ((player.ovr || 0) <= averageActiveOvr - 4) moodDelta = -0.35;

    player.applyMoodDelta(moodDelta * sensitivity);
  });
};

export const applyMatchFatigue = (team, teamSummary, referenceDate = null) => {
  const roster = team?.getRoster?.() || [];
  if (!roster.length) return;

  const statsById = new Map((teamSummary?.playerStats || []).map((stat) => [stat.playerId, stat]));
  roster.forEach((player) => {
    const stat = statsById.get(player.id);
    if (!stat) {
      player.applyFatigue(RESERVE_FATIGUE_RECOVERY);
      return;
    }

    const minutes = Math.max(0, (Number(stat.totalIceTime) || 0) / 60);
    const physical = Number(player.attributes?.attributesJson?.physical) || 65;
    const age = calculateAge(player.identity?.birthDate, referenceDate);
    const isGoalie = player.identity?.primaryPosition === "\u0412\u0420\u0422";
    const primeBonus = age >= 24 && age <= 30 ? 1.2 : age <= 20 ? -1.3 : age >= 34 ? -1.6 : age >= 31 ? -0.7 : 0;
    const enduranceBonus = ((physical - 68) * 0.11) + primeBonus;
    const baseLoad = isGoalie
      ? 4.6 + (minutes / 60) * 6.2
      : 2.2 + Math.max(0, minutes - 8) * 0.22 + Math.max(0, minutes - 16) * 0.34 + Math.max(0, minutes - 22) * 0.42;
    const traitRecoveryFactor = hasHiddenTrait(player, HiddenPlayerTrait.IRON_LUNGS) ? 0.78 : 1;
    const delta = Math.max(0.8, Math.min(isGoalie ? 12 : 15, baseLoad - enduranceBonus)) * FATIGUE_ACCUMULATION_FACTOR * traitRecoveryFactor;
    player.applyFatigue(delta);
  });
};

const getPositionMoodGroup = (position) => {
  if (position === "\u0417\u0410\u0429") return "DEF";
  if (position === "\u0412\u0420\u0422") return "G";
  return "FWD";
};
