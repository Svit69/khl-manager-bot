import { PHOTO_FALLBACK_ATTR } from "../utils/PlayerPhoto.js";
import { renderCoachFit } from "./CoachFitRenderer.js";
import { renderCoachActions, renderCoachMarket } from "./CoachManagementRenderer.js";
const formatDate = (value) => value ? new Date(value).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "2-digit", timeZone: "UTC" }) : "Свободный агент";
const getTopSkill = (ratings = {}) => Object.entries(ratings).sort((left, right) => right[1] - left[1])[0]?.[1] || "—";
const money = (rub) => rub ? `${Math.round(Number(rub) / 1000000)} млн` : "—";
const renderCoachSummary = (coach) => `<div class="coach-summary">
  <div><span>Контракт</span><strong>${formatDate(coach.contractUntil)}</strong></div>
  <div><span>Стиль</span><strong>${coach.style}</strong></div>
  <div><span>Зарплата</span><strong>${money(coach.salaryRub)}</strong></div>
  <div><span>Сильная сторона</span><strong>${getTopSkill(coach.ratings)}</strong></div>
</div>`;

export class CoachTabRenderer {
  render(view) {
    if (!view) return `<section class="coach-screen"><div class="coach-empty">Режим тренеров выключен.</div></section>`;
    const { coach, team, freeCoaches = [], fit = null, message = "", coachOffer = null } = view;
    if (!coach) return `<section class="coach-screen">
      <div class="coach-empty">Главный тренер не назначен.</div>
      ${message ? `<div class="coach-management-message">${message}</div>` : ""}
      ${renderCoachMarket(freeCoaches)}
    </section>`;
    return `<section class="coach-screen">
      <header class="coach-hero">
        <img class="coach-photo" src="${coach.photoUrl}" alt="${coach.name}" ${PHOTO_FALLBACK_ATTR}>
        <div class="coach-title"><span>Главный тренер • ${team?.name || ""}</span><h2>${coach.name}</h2><p>${coach.style} • ${coach.nationality}</p></div>
        <div class="coach-overall"><span>РЕЙТ</span><strong>${coach.overall}</strong></div>
      </header>
      ${renderCoachSummary(coach)}
      <div class="coach-board">
        ${renderCoachFit(fit)}
        ${renderCoachActions(coach, message, coachOffer)}
        ${renderCoachMarket(freeCoaches)}
      </div>
    </section>`;
  }
}
