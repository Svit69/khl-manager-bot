import { CLUB_HISTORY } from "../data/clubHistory.js";

const formatRegularRecord = (row) => `${row?.w || 0}-${row?.l || 0}-${row?.otl || 0}`;
const formatPlayoffRecord = (row) => `${row?.w || 0}-${row?.l || 0}`;
const formatDate = (label) => String(label || "").replace(/\s*г\.$/i, "").replace(/\s+\d{4}$/i, "").toUpperCase();
const getArena = (team) => CLUB_HISTORY[team?.shortName]?.arena || "Ледовая арена";
const getPlayoffRecords = (playoffs = {}) => {
  const records = new Map();
  const add = (teamId, wins, losses) => {
    const row = records.get(teamId) || { w: 0, l: 0 };
    row.w += wins; row.l += losses; records.set(teamId, row);
  };
  (playoffs.rounds || []).forEach((round) => (round.series || []).forEach((series) => {
    const highWins = Number(series.higherSeed?.wins) || 0;
    const lowWins = Number(series.lowerSeed?.wins) || 0;
    add(series.higherSeed?.team?.id, highWins, lowWins);
    add(series.lowerSeed?.team?.id, lowWins, highWins);
  }));
  return records;
};

const renderTeam = (team, record, side) => `<div class="calendar-next-match-team ${side}">
  <img src="${team?.logoUrl || ""}" alt="${team?.name || ""}">
  <strong>${String(team?.name || "").toUpperCase()}</strong>
  <span>${record}</span>
</div>`;

export class CalendarNextMatchRenderer {
  render(match, standings = [], dateLabel = "", playoffs = {}) {
    if (!match?.home || !match?.away) return "";
    const isPlayoff = match.phase === "playoffs";
    const rowsByTeamId = isPlayoff ? getPlayoffRecords(playoffs) : new Map((standings || []).map((row) => [row.teamId, row]));
    const formatRecord = isPlayoff ? formatPlayoffRecord : formatRegularRecord;
    const homeRecord = formatRecord(rowsByTeamId.get(match.home.id));
    const awayRecord = formatRecord(rowsByTeamId.get(match.away.id));
    return `<article class="calendar-next-match-card">
      <h3>БЛИЖАЙШИЙ МАТЧ</h3>
      <div class="calendar-next-match-layout">
        ${renderTeam(match.home, homeRecord, "home")}
        <div class="calendar-next-match-center">
          <span>${formatDate(dateLabel)}</span>
          <strong>17:00</strong>
          <em>${String(getArena(match.home)).toUpperCase()}</em>
          <small>${String(match.home.city || "").toUpperCase()}</small>
        </div>
        ${renderTeam(match.away, awayRecord, "away")}
      </div>
    </article>`;
  }
}
