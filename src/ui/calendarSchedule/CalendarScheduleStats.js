export class CalendarScheduleStats {
  build(rows, activeTeamId, teamPresenter) {
    const games = rows.filter((row) => row.myMatch);
    const home = games.filter((row) => teamPresenter.isHomeMatch(row.myMatch, activeTeamId)).length;
    const away = games.length - home;
    const played = games.filter((row) => row.myMatch?.result);
    const wins = played.filter((row) => this.#isWin(row.myMatch, activeTeamId)).length;
    const overtimeLosses = played.filter((row) => !this.#isWin(row.myMatch, activeTeamId) && row.myMatch.result?.wentToOvertime).length;
    const losses = played.length - wins - overtimeLosses;
    const points = wins * 2 + overtimeLosses;
    return { games: games.length, home, away, wins, losses, overtimeLosses, points, maxPoints: games.length * 2 };
  }

  #isWin(match, activeTeamId) {
    const homeGoals = Number(match?.result?.homeGoals) || 0;
    const awayGoals = Number(match?.result?.awayGoals) || 0;
    return match?.home?.id === activeTeamId ? homeGoals > awayGoals : awayGoals > homeGoals;
  }
}
