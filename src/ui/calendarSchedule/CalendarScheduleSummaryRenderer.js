export class CalendarScheduleSummaryRenderer {
  constructor(dateFormatter, statsModel, teamPresenter) {
    this.dateFormatter = dateFormatter;
    this.statsModel = statsModel;
    this.teamPresenter = teamPresenter;
  }

  render(rows, activeTeamId) {
    const stats = this.statsModel.build(rows, activeTeamId, this.teamPresenter);
    return `<div class="schedule-month-summary">
      <strong>${rows[0] ? this.dateFormatter.getMonthTitle(rows[0]) : ""}</strong>
      <span>${stats.games}<small>МАТЧЕЙ</small></span>
      <span>${stats.home}<small>ДОМА</small></span>
      <span>${stats.away}<small>ВЫЕЗД</small></span>
      <span>${stats.wins}-${stats.losses}-${stats.overtimeLosses}<small>ПОБ-ПОР-ПОП</small></span>
      <span>${stats.points} / ${stats.maxPoints}<small>ОЧКИ</small></span>
    </div>`;
  }
}
