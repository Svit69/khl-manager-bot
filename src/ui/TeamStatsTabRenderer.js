const formatIceTime = (seconds) => {
  const safe = Math.max(0, Math.round(Number(seconds) || 0));
  const minutes = String(Math.floor(safe / 60)).padStart(2, "0");
  const remainder = String(safe % 60).padStart(2, "0");
  return `${minutes}:${remainder}`;
};

const getAverageIceTime = (row) => {
  const games = Math.max(0, Number(row?.games) || 0);
  if (!games) return 0;
  return (Number(row?.totalIceTime) || 0) / games;
};

const SORT_LABELS = {
  points: "очкам",
  goals: "голам",
  iceTime: "айстайму",
  penaltyMinutes: "штрафным минутам",
};

const renderMoodCircle = (mood) => `
  <span
    class="team-stats-mood team-stats-mood--${mood?.tone || "neutral"}"
    title="${mood?.label || "Нейтрально"} • ${mood?.score ?? 0}"
    aria-label="${mood?.label || "Нейтрально"}"
  ></span>
`;

const buildSummary = (rows) => {
  const totals = rows.reduce(
    (summary, row) => {
      summary.points += row.points || 0;
      summary.goals += row.goals || 0;
      summary.games = Math.max(summary.games, row.games || 0);
      return summary;
    },
    { points: 0, goals: 0, games: 0 },
  );
  const leader = rows[0] || null;
  return { totals, leader };
};

const renderTeamOptions = (teams, selectedTeamId) =>
  (teams || [])
    .map((team) => `<option value="${team.id}"${team.id === selectedTeamId ? " selected" : ""}>${team.name}</option>`)
    .join("");

export class TeamStatsTabRenderer {
  render(rows, sortBy = "points", selectedTeamId = null, teams = [], activeTeamId = null) {
    const safeRows = Array.isArray(rows) ? rows : [];
    const { totals, leader } = buildSummary(safeRows);
    const sortLabel = SORT_LABELS[sortBy] || SORT_LABELS.points;
    const selectedTeam = (teams || []).find((team) => team.id === selectedTeamId) || null;
    const activeTeam = (teams || []).find((team) => team.id === activeTeamId) || null;

    return `
      <section class="team-stats-shell">
        <div class="team-stats-hero">
          <div class="team-stats-hero-copy">
            <span class="team-stats-hero-kicker">Статистика команды</span>
            <h3 class="team-stats-hero-title">${selectedTeam?.name || "Команда"} — состав отсортирован по ${sortLabel}</h3>
            <p class="team-stats-hero-text">Показываются текущие игроки выбранного клуба, их сезонные показатели и настроение.</p>
          </div>
          <div class="team-stats-hero-chips">
            <div class="team-stats-hero-chip">
              <small>Игроков</small>
              <strong>${safeRows.length}</strong>
            </div>
            <div class="team-stats-hero-chip">
              <small>Очки команды</small>
              <strong>${totals.points}</strong>
            </div>
            <div class="team-stats-hero-chip">
              <small>Матчей</small>
              <strong>${totals.games}</strong>
            </div>
          </div>
        </div>

        <div class="team-stats-toolbar">
          <div class="team-stats-toolbar-block">
            <span class="team-stats-toolbar-label">Команда</span>
            <label class="team-stats-select-wrap">
              <select class="team-stats-select" data-action="team-stats-team-select">
                ${renderTeamOptions(teams, selectedTeamId)}
              </select>
            </label>
            ${activeTeam && selectedTeamId !== activeTeamId ? `<span class="team-stats-toolbar-hint">Сейчас просматривается соперник</span>` : ""}
          </div>
          <div class="team-stats-toolbar-block team-stats-toolbar-block--right">
            <span class="team-stats-toolbar-label">Сортировка</span>
            <div class="team-stats-toolbar-actions">
              <button class="team-stats-sort-btn${sortBy === "points" ? " active" : ""}" data-action="team-stats-sort" data-sort="points">Очки</button>
              <button class="team-stats-sort-btn${sortBy === "goals" ? " active" : ""}" data-action="team-stats-sort" data-sort="goals">Голы</button>
              <button class="team-stats-sort-btn${sortBy === "iceTime" ? " active" : ""}" data-action="team-stats-sort" data-sort="iceTime">Айс</button>
              <button class="team-stats-sort-btn${sortBy === "penaltyMinutes" ? " active" : ""}" data-action="team-stats-sort" data-sort="penaltyMinutes">ШМ</button>
            </div>
          </div>
        </div>

        ${leader ? `
          <div class="team-stats-leader">
            <div class="team-stats-leader-kicker">Лидер команды</div>
            <div class="team-stats-leader-main">
              <div>
                <div class="team-stats-leader-name">${leader.displayName}</div>
                <div class="team-stats-leader-meta">${leader.position} • OVR ${leader.ovr}</div>
              </div>
              <div class="team-stats-leader-points">${leader.points} О</div>
            </div>
          </div>
        ` : ""}

        <div class="team-stats-panel">
          <div class="team-stats-table">
            <div class="team-stats-head">
              <span class="team-stats-col-player">Игрок</span>
              <span>И</span>
              <span>О</span>
              <span>Г</span>
              <span>П</span>
              <span>ШМ</span>
              <span>Айс</span>
              <span class="team-stats-col-mood">Настр.</span>
            </div>
            <div class="team-stats-body">
              ${safeRows.length ? safeRows.map((row, index) => `
                <article class="team-stats-row">
                  <div class="team-stats-player">
                    <span class="team-stats-rank">${index + 1}</span>
                    <div class="team-stats-player-copy">
                      <strong>${row.displayName}</strong>
                      <span>${row.position} • OVR ${row.ovr}</span>
                    </div>
                  </div>
                  <span class="team-stats-cell" data-label="И">${row.games || 0}</span>
                  <span class="team-stats-cell team-stats-value team-stats-value--accent" data-label="О">${row.points || 0}</span>
                  <span class="team-stats-cell" data-label="Г">${row.goals || 0}</span>
                  <span class="team-stats-cell" data-label="П">${row.assists || 0}</span>
                  <span class="team-stats-cell" data-label="ШМ">${row.penaltyMinutes || 0}</span>
                  <span class="team-stats-cell" data-label="Айс">${formatIceTime(getAverageIceTime(row))}</span>
                  <span class="team-stats-cell team-stats-mood-wrap" data-label="Настр.">
                    ${renderMoodCircle(row.mood)}
                  </span>
                </article>
              `).join("") : `<div class="team-stats-empty">У команды пока нет статистики.</div>`}
            </div>
          </div>
        </div>
      </section>
    `;
  }
}
