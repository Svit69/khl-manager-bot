const monthFormatter = new Intl.DateTimeFormat("ru-RU", { month: "long", year: "numeric", timeZone: "UTC" });
const dayFormatter = new Intl.DateTimeFormat("ru-RU", { day: "2-digit", weekday: "short", timeZone: "UTC" });
const teamCode = (team) => team?.shortName || String(team?.name || "?").slice(0, 3).toUpperCase();

export class CalendarMonthRenderer {
  render(rows = [], activeTeamId = null) {
    const groups = this.#groupByMonth(rows);
    return groups.map(([key, items]) => `<section class="month-schedule-section">
      <div class="month-schedule-head"><span>${key}</span><strong>${items.filter((row) => !row.isRestDay).length} игр</strong></div>
      <div class="month-schedule-grid">${items.map((row) => this.#renderDay(row, activeTeamId)).join("")}</div>
    </section>`).join("") || `<div class="muted">Нет матчей</div>`;
  }

  #groupByMonth(rows) {
    const map = new Map();
    (rows || []).forEach((row) => {
      const date = new Date(row.dateIso);
      const key = Number.isNaN(date.getTime()) ? "Без даты" : monthFormatter.format(date);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(row);
    });
    return [...map.entries()];
  }

  #renderDay(row, activeTeamId) {
    const date = new Date(row.dateIso);
    const dateLabel = Number.isNaN(date.getTime()) ? row.shortDateLabel || row.day : dayFormatter.format(date);
    if (row.isRestDay) return `<article class="month-game-card rest${row.isCurrent ? " current" : ""}"><div class="month-game-date">${dateLabel}</div><div class="month-game-main"><strong>Rest day</strong><span>Без матчей</span></div><div class="month-game-status">—</div></article>`;
    const match = row.myMatch || row.matches?.[0] || null;
    const opponent = activeTeamId && match ? (match.home?.id === activeTeamId ? match.away : match.home) : null;
    const homeCode = teamCode(match?.home);
    const awayCode = teamCode(match?.away);
    const title = opponent ? `vs ${opponent.name}` : `${homeCode} vs ${awayCode}`;
    const meta = row.phase === "playoffs" && row.stageLabel ? row.stageLabel : `${row.matchCount || 0} игр в день`;
    const result = match?.result ? `${match.result.homeGoals}:${match.result.awayGoals}${match.result.wentToOvertime ? " ОТ" : ""}` : (row.isCurrent ? "Today" : "Upcoming");
    return `<article class="month-game-card${row.isCurrent ? " current" : ""}${row.isMyMatch ? " mine" : ""}">
      <div class="month-game-date">${dateLabel}</div>
      <div class="month-game-teams"><span>${homeCode}</span><b></b><span>${awayCode}</span></div>
      <div class="month-game-main"><strong>${title}</strong><span>${meta}</span></div>
      <div class="month-game-status">${result}</div>
    </article>`;
  }
}
