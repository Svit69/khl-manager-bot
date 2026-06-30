const getSeasonLabel = (seasonState = {}) => seasonState.seasonLabel || seasonState.latestArchive?.seasonLabel || "";
const getTeamName = (team = {}) => team.shortName || team.name || "?";
const getScore = (series = {}) => {
  const left = series.higherSeed?.wins ?? 0;
  const right = series.lowerSeed?.wins ?? 0;
  return `${left} — ${right}`;
};

const renderTeam = (entry = {}, side) => {
  const team = entry.team || {};
  return `<span class="calendar-playoff-team-side ${side}">
    <span class="calendar-playoff-seed">${entry.seed || "?"}</span>
    <img src="${team.logoUrl || ""}" alt="${team.name || ""}">
    <strong>${getTeamName(team)}</strong>
  </span>`;
};

const renderSeries = (series, activeTeamId) => {
  const isUserTeam = [series.higherSeed?.team?.id, series.lowerSeed?.team?.id].includes(activeTeamId);
  return `<article class="calendar-playoff-series-card${isUserTeam ? " user-team" : ""}">
    ${renderTeam(series.higherSeed, "home")}
    <span class="calendar-playoff-series-score">${getScore(series)}</span>
    ${renderTeam(series.lowerSeed, "away")}
  </article>`;
};

const renderRound = (round, activeTeamId) => `<section class="calendar-playoff-round">
  <button class="calendar-playoff-round-title" type="button">› ${String(round.name || "").toUpperCase()}</button>
  <div class="calendar-playoff-series-list">${(round.series || []).map((series) => renderSeries(series, activeTeamId)).join("")}</div>
</section>`;

export class CalendarPlayoffRenderer {
  render(playoffs, seasonState, activeTeamId) {
    if (!playoffs?.active) return `<div class="calendar-playoff-empty">Плей-офф еще не начался</div>`;
    const seasonLabel = getSeasonLabel(seasonState);
    const champion = playoffs.champion ? `<div class="calendar-playoff-champion">Кубок берет ${playoffs.champion.name}</div>` : "";
    return `<div class="calendar-playoff-bracket">
      <div class="calendar-playoff-head"><h3>ПЛЕЙ-ОФФ КХЛ</h3><span>${seasonLabel}</span></div>
      ${(playoffs.rounds || []).map((round) => renderRound(round, activeTeamId)).join("")}
      ${champion}
    </div>`;
  }
}
