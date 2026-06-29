const formatDate = (value) => value
  ? new Date(value).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "2-digit", timeZone: "UTC" })
  : "Свободен";
const getConflictBadge = (offer) => offer?.styleConflict ? `<span class="coach-style-conflict">Конфликт стиля</span>` : "";
const getOfferText = (offer) => offer ? `Интерес ${offer.interest}%${offer.reasons?.length ? ` - ${offer.reasons.join(", ")}` : ""}` : "Оценка проекта недоступна";
const getPendingText = (offer) => offer ? `<small>Оффер отправлен, решение в день ${offer.decisionDay}</small>` : "";

export const renderCoachActions = (coach, message = "", offer = null) => `<section class="coach-panel coach-management-panel">
  <h3>Переговоры с тренером</h3>
  <div class="coach-project-line"><span>Проект клуба</span><strong>${getOfferText(offer)}</strong>${getConflictBadge(offer)}</div>
  ${getPendingText(offer?.pendingOffer)}
  <div class="coach-action-grid">
    <button class="coach-action secondary" data-action="coach-renew" data-years="1">Оффер на 1 год</button>
    <button class="coach-action" data-action="coach-renew" data-years="2">Оффер на 2 года</button>
    <button class="coach-action" data-action="coach-renew" data-years="3">Оффер на 3 года</button>
    <button class="coach-action danger" data-action="coach-terminate">Расторгнуть</button>
  </div>
  <div class="coach-management-note">Контракт: <strong>${formatDate(coach?.contractUntil)}</strong> - Амбиции: <strong>${coach?.ambition || 65}</strong></div>
  ${message ? `<div class="coach-management-message">${message}</div>` : ""}
</section>`;

const renderCoachMarketRow = ({ coach, offer, pendingOffer }) => `<article class="coach-market-card">
  <div class="coach-market-card-head">
    <img src="${coach.photoUrl}" alt="${coach.name}">
    <div><strong>${coach.name}</strong><span>Рейтинг</span><b>${coach.overall}</b></div>
  </div>
  <div class="coach-market-card-meta"><span>Стиль</span><strong>${coach.style}</strong></div>
  <div class="coach-market-card-note">${getOfferText(offer)} ${getConflictBadge(offer)}${getPendingText(pendingOffer)}</div>
  <button class="coach-market-sign" data-action="coach-sign" data-coach-id="${coach.id}">${pendingOffer ? "Предложение" : "Нанять"}</button>
</article>`;

export const renderCoachMarket = (freeCoaches = []) => `<section class="coach-panel coach-market-panel">
  <div class="coach-market-head">
    <div><h3>Рынок тренеров</h3><span>Свободны сейчас</span></div>
    <div class="coach-market-tools"><strong>Доступно: ${freeCoaches.length} тренеров</strong><button type="button">Все стили</button></div>
  </div>
  <div class="coach-market-grid">${freeCoaches.map((entry) => renderCoachMarketRow(entry.coach ? entry : { coach: entry, offer: null })).join("") || `<div class="coach-empty">Свободных тренеров нет</div>`}</div>
</section>`;
