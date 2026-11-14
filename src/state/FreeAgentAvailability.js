import { getPlayerIdentityKey } from "../utils/PlayerIdentityKey.js";

export class FreeAgentAvailability {
  static select(players, teams, retiredIds = new Set()) {
    const claimedIds = new Set(), claimedKeys = new Set();
    for (const team of teams) {
      for (const player of [...team.getRoster(), ...(team.juniorPlayers || [])]) {
        claimedIds.add(player.id);
        claimedKeys.add(getPlayerIdentityKey(player));
      }
    }
    const seenIds = new Set(), seenKeys = new Set();
    return players.filter(player => {
      if (!player?.id || player.affiliation?.teamId || retiredIds.has(player.id)) return false;
      const key = getPlayerIdentityKey(player);
      if (claimedIds.has(player.id) || claimedKeys.has(key) || seenIds.has(player.id) || seenKeys.has(key)) return false;
      seenIds.add(player.id); seenKeys.add(key);
      return true;
    });
  }
}
