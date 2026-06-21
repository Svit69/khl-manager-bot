import { renderRafterCard } from "./LegacyRafterCardRenderer.js";

const formatLegacyValue = (value) => value || "—";
const formatPlayerRecordLine = (row) => row ? `${row.name || "—"} • ${row.points || 0} очков` : "Нет данных";

const renderClubHistorySummary = (team, info) => `<section class="legacy-card legacy-card-hero">
  <div><span>Club History</span><h3>${team?.name || "Клуб"}</h3><p>${info?.note || "История клуба начнет наполняться по ходу сохранения."}</p></div>
  <div class="legacy-info-grid">
    <div><small>Founded</small><strong>${formatLegacyValue(info?.founded)}</strong></div>
    <div><small>Arena</small><strong>${formatLegacyValue(info?.arena)}</strong></div>
    <div><small>Identity</small><strong>${formatLegacyValue(info?.identity)}</strong></div>
  </div>
</section>`;

const renderLeagueChampionRow = (row) => `<div class="legacy-row">
  <strong>${row.seasonLabel}</strong><span>${row.championName}</span><b>${row.regularWinnerName}</b><small>${row.topScorerName} ${row.topScorerPoints || ""}</small>
</div>`;

const renderAllTimeScorerRow = (row, index) => `<div class="legacy-row compact">
  <strong>${index + 1}</strong><span>${row.name}</span><b>${row.points}</b><small>${row.goals}+${row.assists}</small>
</div>`;

const renderClubRecords = (records = {}) => `<section class="legacy-card"><div class="legacy-head"><h3>Club Records</h3><span>Лучшие сезоны игроков клуба</span></div>
  <div class="legacy-record"><small>Points Season</small><strong>${formatPlayerRecordLine(records.bestSeason)}</strong></div>
  <div class="legacy-record"><small>Goal Season</small><strong>${formatPlayerRecordLine(records.bestGoalSeason)}</strong></div>
  <div class="legacy-record"><small>Assist Season</small><strong>${formatPlayerRecordLine(records.bestAssistSeason)}</strong></div>
</section>`;

const renderRetiredNumberRafters = (items = []) => `<section class="legacy-card legacy-rafters-card"><div class="legacy-head"><h3>Rafters</h3><span>Выведенные номера клуба</span></div><div class="legacy-rafter-grid">${items.map(renderRafterCard).join("") || `<div class="legacy-empty">Стяги клуба еще не добавлены.</div>`}</div></section>`;

export class LegacyTabRenderer {
  render(view) {
    if (!view?.team) return `<section class="legacy-screen"><div class="legacy-empty">Выберите клуб.</div></section>`;
    const club = view.club || {};
    const league = view.league || {};
    return `<section class="legacy-screen">
      ${renderClubHistorySummary(view.team, club.clubInfo)}
      <section class="legacy-card"><div class="legacy-head"><h3>League Champions</h3><span>История побед всей лиги</span></div>
        <div class="legacy-table-head"><span>Сезон</span><span>Чемпион</span><span>Регулярка</span><span>Бомбардир</span></div>
        <div class="legacy-list">${(league.champions || []).map(renderLeagueChampionRow).join("") || `<div class="legacy-empty">История появится после завершения сезона.</div>`}</div>
      </section>
      <div class="legacy-grid">
        ${renderClubRecords(club.records)}
        <section class="legacy-card"><div class="legacy-head"><h3>All-Time Scorers</h3><span>Лучшие бомбардиры клуба</span></div>${(club.allTimeLeaders || []).slice(0, 6).map(renderAllTimeScorerRow).join("") || `<div class="legacy-empty">Нет данных.</div>`}</section>
        ${renderRetiredNumberRafters(club.retiredNumbers)}
      </div>
    </section>`;
  }
}
