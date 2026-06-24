const renderTableRow = (row) => `<div class="junior-league-row">
  <strong>${row.rank}</strong><span>${row.juniorName}</span><b>${row.points}</b><small>${row.wins}-${row.losses}-${row.otl}</small>
</div>`;

const renderScorerRow = (row) => `<div class="junior-league-row compact">
  <strong>${row.points}</strong><span>${row.name}</span><b>${row.goals}+${row.assists}</b><small>${row.position}</small>
</div>`;

const renderRiskRow = (entry) => `<div class="junior-risk-card ${entry.levelClass || "low"}">
  <div><strong>${entry.player.name}</strong><span>${entry.league}: ${entry.reason}</span></div>
  <b>${entry.level}</b>
</div>`;

export const renderJuniorLeaguePanel = (view) => {
  const leagueRows = (view.league?.rows || []).slice(0, 8);
  const active = view.activeLeagueRow;
  const scorers = view.topScorers || [];
  const risks = view.departureRisks || [];
  return `<section class="junior-manager-section junior-league-panel">
    <div class="junior-manager-section-head">
      <div>
        <h3>Молодежная лига</h3>
        <span>Результаты влияют на развитие, статус роли и интерес Северной Америки</span>
      </div>
      ${active ? `<div class="junior-league-badge">#${active.rank} · ${active.points} очк. · ${active.playoffStatus}</div>` : ""}
    </div>
    <div class="junior-league-grid">
      <div class="junior-league-card"><h4>Таблица</h4>${leagueRows.map(renderTableRow).join("")}</div>
      <div class="junior-league-card"><h4>Бомбардиры</h4>${scorers.map(renderScorerRow).join("") || `<p>Статистики пока нет</p>`}</div>
      <div class="junior-league-card"><h4>Риск отъезда</h4>${risks.map(renderRiskRow).join("") || `<p>Активного риска нет</p>`}</div>
    </div>
  </section>`;
};
