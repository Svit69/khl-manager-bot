import { getPlayerPhotoUrl } from "../utils/PlayerPhoto.js";
import { CLUB_STAT_METRICS, hasClubStats, snapshotPlayerSeasonStats, subtractClubStats } from "./ClubSeasonStatsMath.js";

export { snapshotPlayerSeasonStats };

const movementSnapshot = (entry) => entry?.seasonStatsSnapshot || null;
const rowKey = (row) => row.playerId || row.name;

const latestEntry = (entries, playerId, teamId, seasonLabel, type) =>
  [...(entries || [])]
    .filter((entry) => entry.playerId === playerId && entry.teamId === teamId && entry.seasonLabel === seasonLabel && entry.type === type && movementSnapshot(entry))
    .sort((left, right) => (Number(right.day) || 0) - (Number(left.day) || 0) || String(right.createdAt || "").localeCompare(String(left.createdAt || "")))[0] || null;

const mergeRows = (rows) => {
  const byKey = new Map();
  rows.filter(hasClubStats).forEach((row) => {
    const key = rowKey(row);
    if (!key) return;
    const current = byKey.get(key) || { ...row, ...Object.fromEntries(CLUB_STAT_METRICS.map((metric) => [metric, 0])) };
    CLUB_STAT_METRICS.forEach((metric) => { current[metric] += Number(row[metric]) || 0; });
    byKey.set(key, { ...current, points: current.goals + current.assists });
  });
  return [...byKey.values()];
};

export const buildClubSeasonStatRows = ({ teams = [], transferLedger = [], seasonLabel = "" }) => {
  const currentRows = teams.flatMap((team) => (team.getRoster?.() || []).map((player) => {
    const baseline = movementSnapshot(latestEntry(transferLedger, player.id, team.id, seasonLabel, "in")) || {};
    return {
      teamId: team.id, playerId: player.id, name: player.name, photoUrl: getPlayerPhotoUrl(player),
      position: player.identity?.primaryPosition || "", seasonLabel, ...subtractClubStats(snapshotPlayerSeasonStats(player), baseline),
    };
  }));
  const departedRows = (transferLedger || [])
    .filter((entry) => entry.seasonLabel === seasonLabel && entry.type === "out" && movementSnapshot(entry))
    .map((entry) => {
      const baseline = movementSnapshot(latestEntry(transferLedger, entry.playerId, entry.teamId, seasonLabel, "in")) || {};
      return { teamId: entry.teamId, playerId: entry.playerId, name: entry.playerName, photoUrl: entry.photoUrl || "", position: entry.position || "", seasonLabel, ...subtractClubStats(movementSnapshot(entry), baseline) };
    });
  return mergeRows([...currentRows, ...departedRows]);
};
