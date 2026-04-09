import { buildCompetitiveLines } from "../data/lineupBuilder.js";

export const importSavedRosters = ({ teams, rosters, allPlayers, refreshExpectedRoles }) => {
  const playersById = new Map((allPlayers || []).map((player) => [player.id, player]));
  (rosters || []).forEach((item) => {
    const team = (teams || []).find((entry) => entry.id === item.teamId);
    if (!team) return;

    const restored = restoreSavedRoster(team, item, playersById);
    if (!restored) {
      const picked = (item.playerIds || []).map((playerId) => playersById.get(playerId)).filter(Boolean);
      picked.forEach((player) => {
        player.affiliation.teamId = team.id;
      });
      const lineup = buildCompetitiveLines(picked);
      team.lines.splice(0, team.lines.length, ...lineup.lines);
      team.reservePlayers.splice(0, team.reservePlayers.length, ...lineup.reservePlayers);
    }

    refreshExpectedRoles(team);
  });
};

export const applyFantasyDraftAssignments = ({
  teams,
  allPlayers,
  assignmentsByTeamId,
  contracts,
  refreshExpectedRoles,
}) => {
  const draftedPlayersById = new Map();
  Object.values(assignmentsByTeamId || {})
    .flat()
    .forEach((player) => {
      if (player?.id) draftedPlayersById.set(player.id, player);
    });

  const undraftedPlayers = (allPlayers || []).filter((player) => !draftedPlayersById.has(player.id));

  (teams || []).forEach((team) => {
    const picked = [...(assignmentsByTeamId?.[team.id] || [])];
    picked.forEach((player) => {
      player.affiliation.teamId = team.id;
      player.affiliation.acquiredDay = null;
      player.potential?.resetFreeAgentInactivity?.();
      contracts.reassignPlayerContracts(player.id, team.id);
    });

    const lineup = buildCompetitiveLines(picked);
    team.lines.splice(0, team.lines.length, ...lineup.lines);
    team.reservePlayers.splice(0, team.reservePlayers.length, ...lineup.reservePlayers);
    refreshExpectedRoles(team);
  });

  undraftedPlayers.forEach((player) => {
    player.affiliation.teamId = null;
    player.affiliation.contractId = null;
    player.affiliation.acquiredDay = null;
    player.expectedLineIndex = null;
  });
  contracts.releasePlayers(undraftedPlayers.map((player) => player.id));
  return { undraftedPlayers };
};

export const createRosterSnapshots = (teams) =>
  (teams || []).map((team) => ({
    teamId: team.id,
    linePlayerIds: team.lines.map((line) => line.players.map((player) => player?.id || null)),
    reservePlayerIds: team.reservePlayers.map((player) => player.id),
  }));

const restoreSavedRoster = (team, item, playersById) => {
  const linePlayerIds = item?.linePlayerIds;
  const reservePlayerIds = item?.reservePlayerIds;
  if (!Array.isArray(linePlayerIds) || !Array.isArray(reservePlayerIds)) return false;

  linePlayerIds.forEach((lineIds, lineIndex) => {
    const line = team.lines[lineIndex];
    if (!line || !Array.isArray(lineIds)) return;

    const paddedLineIds = Array.from({ length: line.positions.length }, (_, slotIndex) => lineIds[slotIndex] || null);
    line.players.splice(
      0,
      line.players.length,
      ...paddedLineIds.map((playerId) => {
        const player = playerId ? playersById.get(playerId) : null;
        if (player) player.affiliation.teamId = team.id;
        return player || null;
      }),
    );
  });

  team.reservePlayers.splice(
    0,
    team.reservePlayers.length,
    ...reservePlayerIds
      .map((playerId) => {
        const player = playersById.get(playerId);
        if (player) player.affiliation.teamId = team.id;
        return player;
      })
      .filter(Boolean),
  );

  return true;
};
