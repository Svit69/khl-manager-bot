const formatDate = (value) => value ? new Date(value).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "2-digit", timeZone: "UTC" }) : "Свободен";

export const renderCoachActions = (coach, message = "") => `<section class="coach-panel coach-management-panel">
  <h3>Coach Management</h3>
  <div class="coach-action-grid">
    <button class="coach-action" data-action="coach-renew" data-years="1">Продлить на 1 год</button>
    <button class="coach-action" data-action="coach-renew" data-years="2">Продлить на 2 года</button>
    <button class="coach-action secondary" data-action="coach-renew" data-years="3">Продлить на 3 года</button>
    <button class="coach-action danger" data-action="coach-terminate">Расторгнуть</button>
  </div>
  <div class="coach-management-note">Текущий контракт: <strong>${formatDate(coach?.contractUntil)}</strong></div>
  ${message ? `<div class="coach-management-message">${message}</div>` : ""}
</section>`;

const renderCoachMarketRow = (coach) => `<div class="coach-market-row coach-market-row--action">
  <span title="${coach.name}">${coach.name}</span>
  <strong>${coach.style}</strong>
  <em>OVR ${coach.overall}</em>
  <button class="coach-market-sign" data-action="coach-sign" data-coach-id="${coach.id}">2 года</button>
</div>`;

export const renderCoachMarket = (freeCoaches = []) => `<section class="coach-panel">
  <h3>Available Coaches</h3>
  ${freeCoaches.map(renderCoachMarketRow).join("") || `<div class="coach-empty">Свободных тренеров нет</div>`}
</section>`;
