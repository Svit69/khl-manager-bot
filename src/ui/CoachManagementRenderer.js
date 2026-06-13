const formatDate = (value) => value ? new Date(value).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "2-digit", timeZone: "UTC" }) : "Свободен";
const money = (rub) => `${Math.round((Number(rub) || 0) / 1000000)} млн`;

export const renderCoachActions = (coach, message = "", offer = null) => `<section class="coach-panel coach-management-panel">
  <h3>Управление</h3>
  <div class="coach-money-line"><span>Запрос</span><strong>${money(offer?.demandRub || coach?.salaryRub)}</strong></div>
  <div class="coach-action-grid">
    <button class="coach-action secondary" data-action="coach-renew" data-years="1" data-factor=".92">Эконом</button>
    <button class="coach-action" data-action="coach-renew" data-years="2" data-factor="1">Рынок</button>
    <button class="coach-action" data-action="coach-renew" data-years="3" data-factor="1.12">Щедро</button>
    <button class="coach-action danger" data-action="coach-terminate">Расторгнуть</button>
  </div>
  <div class="coach-management-note">Контракт: <strong>${formatDate(coach?.contractUntil)}</strong> • Зарплата: <strong>${money(coach?.salaryRub)}</strong></div>
  ${message ? `<div class="coach-management-message">${message}</div>` : ""}
</section>`;

const renderCoachMarketRow = ({ coach, offer }) => `<div class="coach-market-row coach-market-row--action">
  <span title="${coach.name}">${coach.name}</span>
  <strong>${coach.style} • ${coach.overall}</strong>
  <em>${money(offer?.demandRub)}</em>
  <button class="coach-market-sign" data-action="coach-sign" data-coach-id="${coach.id}" data-factor="1.1">Подписать</button>
</div>`;

export const renderCoachMarket = (freeCoaches = []) => `<section class="coach-panel">
  <h3>Рынок тренеров</h3>
  ${freeCoaches.map((entry) => renderCoachMarketRow(entry.coach ? entry : { coach: entry, offer: null })).join("") || `<div class="coach-empty">Свободных тренеров нет</div>`}
</section>`;
