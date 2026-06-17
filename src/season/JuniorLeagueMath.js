import { getJuniorSeasonAge } from "./JuniorEligibility.js";

export const hashJuniorLeagueText = (value) => {
  let hash = 2166136261;
  String(value || "").split("").forEach((char) => {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  });
  return hash >>> 0;
};

export const calculateJuniorTeamPower = (team, seasonLabel) => {
  const players = [...(team?.juniorPlayers || [])].sort((a, b) => (b.ovr || 0) - (a.ovr || 0)).slice(0, 18);
  if (!players.length) return 52;
  const total = players.reduce((sum, player) => {
    const age = getJuniorSeasonAge(player, seasonLabel);
    const potential = Number(player.potential?.potential) || Number(player.ovr) || 0;
    return sum + (Number(player.ovr) || 0) + Math.max(0, potential - (player.ovr || 0)) * 0.18 + Math.max(0, 20 - age) * 0.35;
  }, 0);
  return total / players.length;
};

export const buildJuniorScorerRow = (team, player, seasonLabel) => {
  const seed = hashJuniorLeagueText(`${player.id}:${seasonLabel}:stats`);
  const age = getJuniorSeasonAge(player, seasonLabel);
  const ovr = Number(player.ovr) || 0;
  const base = Math.max(8, ovr - 50 + Math.max(0, 19 - age));
  const goals = Math.round(base * (0.42 + (seed % 15) / 100));
  const assists = Math.round(base * (0.48 + ((seed >>> 4) % 22) / 100));
  return {
    playerId: player.id,
    teamId: team.id,
    name: player.name,
    position: player.identity?.primaryPosition || "-",
    games: 46,
    goals,
    assists,
    points: goals + assists,
    developmentBonus: Math.min(0.18, (goals + assists) / 360),
  };
};
