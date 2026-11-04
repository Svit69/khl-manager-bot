import { importSavedRosters } from "./AppStateRoster.js";

export const restoreUserLineup = ({ team, snapshot, players, refreshExpectedRoles }) => {
  if (!team || !snapshot?.linePlayerIds) return;
  const currentRoster = team.getRoster(), currentJuniors = [...team.juniorPlayers];
  const allowedPlayers = players.filter(player => player.affiliation?.teamId === team.id);
  importSavedRosters({ teams: [team], rosters: [snapshot], allPlayers: allowedPlayers, refreshExpectedRoles });
  const restoredIds = new Set([...team.getRoster(), ...team.juniorPlayers].map(player => player.id));
  for (const player of currentRoster) {
    if (!restoredIds.has(player.id)) { team.reservePlayers.push(player); restoredIds.add(player.id); }
  }
  for (const player of currentJuniors) {
    if (!restoredIds.has(player.id)) { team.juniorPlayers.push(player); restoredIds.add(player.id); }
  }
};
