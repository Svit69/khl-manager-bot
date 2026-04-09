import { calculateAge } from "../contracts/SeasonUtils.js";

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

const getPositionMoodGroup = (position) => {
  if (position === "ЗАЩ") return "DEF";
  if (position === "ВРТ") return "G";
  return "FWD";
};
