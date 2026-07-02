import { renderRafterCard } from "./LegacyRafterCardRenderer.js";
import { renderClubHistoryPanel, renderLegacyTabs } from "./LegacyClubHistoryRenderer.js";
import { renderClubRecords } from "./LegacyClubRecordsRenderer.js";

const renderLeagueChampionRow = (row) => `<div class="legacy-row">
  <strong>${row.seasonLabel}</strong><span>${row.championName}</span><b>${row.regularWinnerName}</b><small>${row.topScorerName} ${row.topScorerPoints || ""}</small>
</div>`;

const renderAllTimeScorerRow = (row, index) => `<div class="legacy-row compact">
  <strong>${index + 1}</strong><span>${row.name}</span><b>${row.points}</b><small>${row.goals}+${row.assists}</small>
</div>`;

const renderRetiredNumberRafters = (items = []) => `<section class="legacy-card legacy-rafters-card"><div class="legacy-head"><h3>Выведенные номера</h3><span>Имена и номера под сводами арены</span></div><div class="legacy-rafter-grid">${items.map(renderRafterCard).join("") || `<div class="legacy-empty">Стяги клуба еще не добавлены.</div>`}</div></section>`;

export class LegacyTabRenderer {
  render(view) {
    if (!view?.team) return `<section class="legacy-screen"><div class="legacy-empty">Выберите клуб.</div></section>`;
    const club = view.club || {};
    const league = view.league || {};
    return `<section class="legacy-screen">
      ${renderLegacyTabs()}
      ${renderClubHistoryPanel(view.team, club.clubInfo)}
      <div class="legacy-grid">
        ${renderClubRecords(club.records)}
        <section class="legacy-card"><div class="legacy-head"><h3>Лучшие бомбардиры</h3><span>Лучшие бомбардиры клуба</span></div>${(club.allTimeLeaders || []).slice(0, 6).map(renderAllTimeScorerRow).join("") || `<div class="legacy-empty">Нет данных.</div>`}</section>
      </div>
      ${renderRetiredNumberRafters(club.retiredNumbers)}
      <section class="legacy-card"><div class="legacy-head"><h3>Чемпионы лиги</h3><span>История побед всей лиги</span></div>
        <div class="legacy-table-head"><span>Сезон</span><span>Чемпион</span><span>Регулярка</span><span>Бомбардир</span></div>
        <div class="legacy-list">${(league.champions || []).map(renderLeagueChampionRow).join("") || `<div class="legacy-empty">История появится после завершения сезона.</div>`}</div>
      </section>
    </section>`;
  }
}
