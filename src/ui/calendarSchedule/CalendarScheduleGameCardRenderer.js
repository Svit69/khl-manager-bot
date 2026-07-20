export class CalendarScheduleGameCardRenderer {
  constructor(dateFormatter, teamPresenter, resultPresenter) {
    this.dateFormatter = dateFormatter;
    this.teamPresenter = teamPresenter;
    this.resultPresenter = resultPresenter;
  }

  render(row, activeTeamId) {
    const match = row.myMatch;
    const opponent = this.teamPresenter.getOpponent(match, activeTeamId);
    const result = this.resultPresenter.getResult(match, activeTeamId, row);
    const venue = this.teamPresenter.isHomeMatch(match, activeTeamId) ? "ДОМА" : "ВЫЕЗД";
    return `<article class="schedule-game-card ${result.className}${row.isCurrent ? " current" : ""}">
      <div class="schedule-date-box"><strong>${this.dateFormatter.getDayNumber(row)}</strong><span>${this.dateFormatter.getShortMonth(row)}</span></div>
      <img class="schedule-opponent-logo" src="${opponent?.logoUrl || "./khl-logo/default.png"}" alt="${opponent?.name || ""}"/>
      <div class="schedule-opponent"><strong>${this.teamPresenter.getOpponentName(opponent)}</strong><span>${this.teamPresenter.getOpponentCity(opponent)}</span></div>
      <div class="schedule-game-meta"><span>${venue}</span><strong>${this.dateFormatter.getMatchTime(match, row)}</strong></div>
      <div class="schedule-result-pill"><span>${result.label}</span>${result.score ? `<strong>${result.score}</strong>` : ""}</div>
    </article>`;
  }
}
