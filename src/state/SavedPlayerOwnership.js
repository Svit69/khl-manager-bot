export class SavedPlayerOwnership {
  static reconcile({ teams, players, contracts, seasonLabel, retiredIds }) {
    const byId = new Map(players.map(player => [player.id, player]));
    const teamIds = new Set(teams.map(team => team.id));
    for (const player of byId.values()) {
      if (retiredIds.has(player.id) || player.externalCareer) continue;
      const contract = contracts.getContractForSeason(player.id, seasonLabel);
      if (!contract || !teamIds.has(contract.teamId)) continue;
      player.affiliation.teamId = contract.teamId;
      player.affiliation.contractId = contract.id;
    }
    const placed = new Set();
    for (const team of teams) {
      const clean = (array, fixed) => {
        for (let index = 0; index < array.length; index++) {
          const player = byId.get(array[index]?.id);
          if (player && player.affiliation.teamId === team.id && !retiredIds.has(player.id) && !placed.has(player.id)) {
            array[index] = player; placed.add(player.id);
          } else if (fixed) array[index] = null;
          else { array.splice(index, 1); index--; }
        }
      };
      team.lines.forEach(line => clean(line.players, true));
      clean(team.reservePlayers, false);
      clean(team.juniorPlayers, false);
    }
    for (const player of byId.values()) {
      const team = teams.find(row => row.id === player.affiliation?.teamId);
      if (!team || retiredIds.has(player.id) || placed.has(player.id)) continue;
      team.reservePlayers.push(player); placed.add(player.id);
    }
  }
}
