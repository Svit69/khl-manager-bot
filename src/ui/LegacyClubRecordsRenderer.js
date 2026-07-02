const metricValue = (row, metric) => Number(row?.[metric]) || 0;

const metricLabel = (metric) => ({
  points: "очков",
  goals: "голов",
  assists: "передач",
}[metric] || "");

const formatRecordLine = (row, metric) => row
  ? `${row.name || "—"} • ${metricValue(row, metric)} ${metricLabel(metric)}`
  : "Нет данных";

export const renderClubRecords = (records = {}) => `<section class="legacy-card legacy-records-card">
  <div class="legacy-head"><h3>Рекорды клуба</h3><span>Лучшие сезоны игроков клуба</span></div>
  <div class="legacy-record"><small>Сезон по очкам</small><strong>${formatRecordLine(records.bestSeason, "points")}</strong></div>
  <div class="legacy-record"><small>Сезон по голам</small><strong>${formatRecordLine(records.bestGoalSeason, "goals")}</strong></div>
  <div class="legacy-record"><small>Сезон по передачам</small><strong>${formatRecordLine(records.bestAssistSeason, "assists")}</strong></div>
</section>`;
