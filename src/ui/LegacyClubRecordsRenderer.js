import { PHOTO_FALLBACK_ATTR } from "../utils/PlayerPhoto.js";

const RECORD_CARDS = Object.freeze([
  { key: "bestSeason", metric: "points", title: "Больше всего очков", unit: "очков", accent: "gold" },
  { key: "bestGoalSeason", metric: "goals", title: "Больше всего голов", unit: "голов", accent: "blue" },
  { key: "bestAssistSeason", metric: "assists", title: "Больше всего передач", unit: "передач", accent: "purple" },
]);

const metricValue = (row, metric) => Number(row?.[metric]) || 0;
const playerName = (row) => String(row?.name || "Нет данных").toUpperCase();
const playerPhoto = (row) => row?.photoUrl || "./player-photo/default.png";
const seasonLabel = (row) => row?.seasonLabel || "Сезон не указан";

const renderRecordCard = (records, card) => {
  const row = records?.[card.key] || null;
  return `<article class="legacy-season-leader ${card.accent}">
    <span class="legacy-season-leader-star">☆</span>
    <img src="${playerPhoto(row)}" alt="${playerName(row)}" ${PHOTO_FALLBACK_ATTR}>
    <div class="legacy-season-leader-body">
      <small>${card.title}</small>
      <strong>${playerName(row)}</strong>
      <em>${seasonLabel(row)}</em>
      <div><b>${metricValue(row, card.metric)}</b><span>${card.unit}</span></div>
    </div>
  </article>`;
};

export const renderClubRecords = (records = {}) => `<section class="legacy-card legacy-records-card">
  <div class="legacy-head"><h3>Лучшие игроки сезонов</h3></div>
  <div class="legacy-season-leaders">${RECORD_CARDS.map((card) => renderRecordCard(records, card)).join("")}</div>
</section>`;
