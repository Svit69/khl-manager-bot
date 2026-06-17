const renderTableRow = (row) =>
  `<div class="junior-league-row">
    <strong>${row.rank}</strong><span>${row.juniorName}</span><b>${row.points}</b><small>${row.wins}-${row.losses}-${row.otl}</small>
  </div>`;

const renderScorerRow = (row) =>
  `<div class="junior-league-row compact">
    <strong>${row.points}</strong><span>${row.name}</span><b>${row.goals}+${row.assists}</b><small>${row.position}</small>
  </div>`;

const renderRiskRow = (entry) =>
  `<div class="junior-risk-card ${String(entry.level || "").toLowerCase()}">
    <div><strong>${entry.player.name}</strong><span>${entry.league} interest • ${entry.reason}</span></div>
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
        <h3>Youth League</h3>
        <span>Results affect development, role security, and North America interest</span>
      </div>
      ${active ? `<div class="junior-league-badge">#${active.rank} • ${active.points} pts • ${active.playoffStatus}</div>` : ""}
    </div>
    <div class="junior-league-grid">
      <div class="junior-league-card"><h4>Standings</h4>${leagueRows.map(renderTableRow).join("")}</div>
      <div class="junior-league-card"><h4>Team Scorers</h4>${scorers.map(renderScorerRow).join("") || `<p>No scoring data yet</p>`}</div>
      <div class="junior-league-card"><h4>Departure Risk</h4>${risks.map(renderRiskRow).join("") || `<p>No active risk</p>`}</div>
    </div>
  </section>`;
};
