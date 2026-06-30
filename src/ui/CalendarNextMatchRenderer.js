import { CLUB_HISTORY } from "../data/clubHistory.js";

const formatRecord = (row) => `${row?.w || 0}-${row?.l || 0}-${row?.otl || 0}`;
const formatDate = (label) => String(label || "").replace(/\s*г\.$/i, "").replace(/\s+\d{4}$/i, "").toUpperCase();
const getArena = (team) => CLUB_HISTORY[team?.shortName]?.arena || "Ледовая арена";

const renderTeam = (team, row, side) => `<div class="calendar-next-match-team ${side}">
  <img src="${team?.logoUrl || ""}" alt="${team?.name || ""}">
  <strong>${String(team?.name || "").toUpperCase()}</strong>
  <span>${formatRecord(row)}</span>
</div>`;

export class CalendarNextMatchRenderer {
  render(match, standings = [], dateLabel = "") {
    if (!match?.home || !match?.away) return "";
    const rowsByTeamId = new Map((standings || []).map((row) => [row.teamId, row]));
    const homeRow = rowsByTeamId.get(match.home.id);
    const awayRow = rowsByTeamId.get(match.away.id);
    return `<article class="calendar-next-match-card">
      <h3>БЛИЖАЙШИЙ МАТЧ</h3>
      <div class="calendar-next-match-layout">
        ${renderTeam(match.home, homeRow, "home")}
        <div class="calendar-next-match-center">
          <span>${formatDate(dateLabel)}</span>
          <strong>17:00</strong>
          <em>${String(getArena(match.home)).toUpperCase()}</em>
          <small>${String(match.home.city || "").toUpperCase()}</small>
        </div>
        ${renderTeam(match.away, awayRow, "away")}
      </div>
    </article>`;
  }
}
