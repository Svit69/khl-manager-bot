export class LoanRosterTransfer {
  static arrays(team) { return [...team.lines.map(line => line.players), team.reservePlayers, team.juniorPlayers]; }
  static validate(player, source, target) {
    if (!player?.affiliation || !source?.lines || !target?.lines) return false;
    const occurrences = team => this.arrays(team).flat().filter(item => item?.id === player.id);
    const found = occurrences(source);
    return found.length === 1 && found[0] === player && occurrences(target).length === 0;
  }
  static move(player, source, target) {
    if (!this.validate(player, source, target)) throw new Error("INVALID_ROSTER");
    for (const array of this.arrays(source)) {
      const index = array.indexOf(player);
      if (index < 0) continue;
      if (source.lines.some(line => line.players === array)) array[index] = null;
      else array.splice(index, 1);
      break;
    }
    target.reservePlayers.push(player);
    player.affiliation.teamId = target.id;
  }
}
