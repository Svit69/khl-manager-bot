import { renderRafterCard } from "./LegacyRafterCardRenderer.js";
import { renderClubHistoryPanel, renderLegacyTabs } from "./LegacyClubHistoryRenderer.js";
import { renderClubRecords } from "./LegacyClubRecordsRenderer.js";
import { renderLeagueHistory } from "./LegacyLeagueHistoryRenderer.js";

const renderAllTimeScorerRow = (row, index) => `<div class="legacy-row compact">
  <strong>${index + 1}</strong><span>${row.name}</span><b>${row.points}</b><small>${row.goals}+${row.assists}</small>
</div>`;

const renderRafterThumb = (row) => `<span class="legacy-rafter-thumb"><b>${row.number}</b></span>`;
const renderRetiredNumberRafters = (items = []) => `<section class="legacy-rafters-card">
  <div class="legacy-rafters-head"><h3>Джерси под сводами арены</h3><span>Показано ${Math.min(items.length, 4)} из ${items.length} легенд</span></div>
  <div class="legacy-rafter-track">${items.map(renderRafterCard).join("") || `<div class="legacy-empty">Стяги клуба еще не добавлены.</div>`}</div>
  ${items.length ? `<div class="legacy-rafter-thumbs">${items.map(renderRafterThumb).join("")}</div>` : ""}
</section>`;

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
        <section class="legacy-card">
          <div class="legacy-head"><h3>Лучшие бомбардиры</h3><span>Лучшие бомбардиры клуба</span></div>
          ${(club.allTimeLeaders || []).slice(0, 6).map(renderAllTimeScorerRow).join("") || `<div class="legacy-empty">Нет данных.</div>`}
        </section>
      </div>
      ${renderRetiredNumberRafters(club.retiredNumbers)}
      ${renderLeagueHistory(league)}
    </section>`;
  }
}
