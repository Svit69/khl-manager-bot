import { PHOTO_FALLBACK_ATTR } from "../utils/PlayerPhoto.js";
import { renderCoachMarket } from "./CoachManagementRenderer.js";

const formatDate = (value) => value ? new Date(value).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "2-digit", timeZone: "UTC" }) : "Свободный агент";
const getBestPlayoffResult = (experience = {}) => {
  if (experience.championships) return "Чемпион";
  if (experience.finals) return "Финал";
  if (experience.semifinals) return "Полуфинал";
  if (experience.quarterFinals) return "1/4 финала";
  return experience.playoffAppearances ? "Плей-офф" : "Без плей-офф";
};
const renderCoachInfo = (coach) => [
  ["Контракт до:", formatDate(coach.contractUntil)],
  ["Опыт:", `${coach.experience?.leagueSeasons || coach.seasonsCoached || 0} сезонов`],
  ["Выходов в плей-офф:", `${coach.experience?.playoffAppearances || 0}`],
  ["Лучший результат:", getBestPlayoffResult(coach.experience)],
  ["Кубков:", `${coach.experience?.championships || 0}`],
].map(([label, value]) => `<div class="coach-profile-info-row"><span>${label}</span><strong>${value}</strong></div>`).join("");
const renderCoachProfile = (coach) => `<section class="coach-profile-card">
  <div class="coach-profile-photo-panel">
    <img class="coach-profile-bg" src="./coach-background/coach-red.png" alt="" aria-hidden="true">
    <img class="coach-profile-photo" src="${coach.photoUrl}" alt="${coach.name}" ${PHOTO_FALLBACK_ATTR}>
    <div class="coach-profile-shade"></div>
    <div class="coach-profile-caption">
      <h3>${String(coach.name || "").toUpperCase()}</h3>
      <span>ГЛАВНЫЙ ТРЕНЕР</span>
      <small>В КЛУБЕ С <strong>МАЙ 2024</strong></small>
    </div>
  </div>
  <div class="coach-profile-info">${renderCoachInfo(coach)}</div>
</section>`;
const renderCoachToolbar = () => `<div class="coach-tab-switcher"><button class="active">ГЛАВНЫЙ ТРЕНЕР</button><button>АССИСТЕНТЫ</button><button>РЫНОК ТРЕНЕРОВ</button></div>`;
const renderCoachProfileActions = (message = "") => `<div class="coach-profile-actions">
  <button class="coach-action" data-action="coach-renew" data-years="2">ПРОДЛИТЬ КОНТРАКТ</button>
  <button class="coach-action danger" data-action="coach-terminate">РАСТОРГНУТЬ КОНТРАКТ</button>
  ${message ? `<div class="coach-management-message">${message}</div>` : ""}
</div>`;

export class CoachTabRenderer {
  render(view) {
    if (!view) return `<section class="coach-screen"><div class="coach-empty">Режим тренеров выключен.</div></section>`;
    const { coach, freeCoaches = [], message = "" } = view;
    if (!coach) return `<section class="coach-screen">${renderCoachToolbar()}<div class="coach-empty">Главный тренер не назначен.</div>${message ? `<div class="coach-management-message">${message}</div>` : ""}${renderCoachMarket(freeCoaches)}</section>`;
    return `<section class="coach-screen">
      ${renderCoachToolbar()}
      ${renderCoachProfile(coach)}
      ${renderCoachProfileActions(message)}
      ${renderCoachMarket(freeCoaches)}
    </section>`;
  }
}
