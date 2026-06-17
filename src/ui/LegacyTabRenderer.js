const fmt = (value) => value || "—";
const playerLine = (row) => row ? `${row.name || "—"} • ${row.points || 0} очков` : "Нет данных";

const renderClubInfo = (team, info) => `<section class="legacy-card legacy-card-hero">
  <div><span>Club History</span><h3>${team?.name || "Клуб"}</h3><p>${info?.note || "История клуба начнет наполняться по ходу сохранения."}</p></div>
  <div class="legacy-info-grid">
    <div><small>Founded</small><strong>${fmt(info?.founded)}</strong></div>
    <div><small>Arena</small><strong>${fmt(info?.arena)}</strong></div>
    <div><small>Identity</small><strong>${fmt(info?.identity)}</strong></div>
  </div>
</section>`;

const renderChampion = (row) => `<div class="legacy-row">
  <strong>${row.seasonLabel}</strong><span>${row.championName}</span><b>${row.regularWinnerName}</b><small>${row.topScorerName} ${row.topScorerPoints || ""}</small>
</div>`;

const renderLeader = (row, index) => `<div class="legacy-row compact">
  <strong>${index + 1}</strong><span>${row.name}</span><b>${row.points}</b><small>${row.goals}+${row.assists}</small>
</div>`;

const renderNumber = (row) => `<div class="legacy-number-card">
  <strong>${row.number}</strong><span>${row.name}</span><small>${row.points} pts • ${row.seasons} seasons</small>
</div>`;

export class LegacyTabRenderer {
  render(view) {
    if (!view?.team) return `<section class="legacy-screen"><div class="legacy-empty">Выберите клуб.</div></section>`;
    const club = view.club || {};
    const league = view.league || {};
    return `<section class="legacy-screen">
      ${renderClubInfo(view.team, club.clubInfo)}
      <section class="legacy-card"><div class="legacy-head"><h3>League Champions</h3><span>История побед всей лиги</span></div>
        <div class="legacy-table-head"><span>Сезон</span><span>Чемпион</span><span>Регулярка</span><span>Бомбардир</span></div>
        <div class="legacy-list">${(league.champions || []).map(renderChampion).join("") || `<div class="legacy-empty">История появится после завершения сезона.</div>`}</div>
      </section>
      <div class="legacy-grid">
        <section class="legacy-card"><div class="legacy-head"><h3>Club Records</h3><span>Лучшие сезоны игроков клуба</span></div>
          <div class="legacy-record"><small>Points Season</small><strong>${playerLine(club.records?.bestSeason)}</strong></div>
          <div class="legacy-record"><small>Goal Season</small><strong>${playerLine(club.records?.bestGoalSeason)}</strong></div>
          <div class="legacy-record"><small>Assist Season</small><strong>${playerLine(club.records?.bestAssistSeason)}</strong></div>
        </section>
        <section class="legacy-card"><div class="legacy-head"><h3>All-Time Scorers</h3><span>Лучшие бомбардиры клуба</span></div>${(club.allTimeLeaders || []).slice(0, 6).map(renderLeader).join("") || `<div class="legacy-empty">Нет данных.</div>`}</section>
        <section class="legacy-card"><div class="legacy-head"><h3>Rafters</h3><span>Кандидаты на закрепление номера</span></div><div class="legacy-number-grid">${(club.retiredNumbers || []).map(renderNumber).join("") || `<div class="legacy-empty">Легенды еще формируются.</div>`}</div></section>
      </div>
    </section>`;
  }
}
