export class CalendarScheduleResultPresenter {
  getResult(match, activeTeamId, row) {
    if (!match?.result) return row?.isCurrent ? { label: "СЕГОДНЯ", score: "", className: "today" } : { label: "СКОРО", score: "", className: "soon" };
    const homeGoals = Number(match.result.homeGoals) || 0;
    const awayGoals = Number(match.result.awayGoals) || 0;
    const activeGoals = match.home?.id === activeTeamId ? homeGoals : awayGoals;
    const opponentGoals = match.home?.id === activeTeamId ? awayGoals : homeGoals;
    const won = activeTeamId ? activeGoals > opponentGoals : homeGoals > awayGoals;
    const score = activeTeamId ? `${activeGoals}:${opponentGoals}` : `${homeGoals}:${awayGoals}`;
    return { label: won ? "ПОБЕДА" : "ПОРАЖЕНИЕ", score, className: won ? "win" : "loss" };
  }
}
