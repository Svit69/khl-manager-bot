export class TransferRosterMover {
  findPlayer(teams, playerId) {
    for (const team of teams) {
      const player = this.#findInTeam(team, playerId);
      if (player) return { team, player };
    }
    return null;
  }

  movePlayerToTeam(teams, player, targetTeamId) {
    const targetTeam = teams.find((team) => team.id === targetTeamId);
    if (!targetTeam || !player) return false;
    this.removePlayerFromTeams(teams, player.id);
    player.affiliation.teamId = targetTeam.id;
    targetTeam.reservePlayers.push(player);
    return true;
  }

  removePlayerFromTeams(teams, playerId) {
    teams.forEach((team) => {
      team.lines.forEach((line) => {
        line.players.forEach((player, index) => { if (player?.id === playerId) line.players[index] = null; });
      });
      for (let index = team.reservePlayers.length - 1; index >= 0; index--) {
        if (team.reservePlayers[index]?.id === playerId) team.reservePlayers.splice(index, 1);
      }
    });
  }

  #findInTeam(team, playerId) {
    return team.getRoster().find((player) => player.id === playerId) || null;
  }
}
