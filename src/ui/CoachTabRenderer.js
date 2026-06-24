import { PHOTO_FALLBACK_ATTR } from "../utils/PlayerPhoto.js";
import { renderCoachFit } from "./CoachFitRenderer.js";
import { renderCoachActions, renderCoachMarket } from "./CoachManagementRenderer.js";

const SKILL_LABELS = { tactics: "Тактика", offense: "Атака", defense: "Оборона", discipline: "Дисциплина", playerDevelopment: "Развитие", lockerRoom: "Раздевалка", conditioning: "Форма", playoffPoise: "Плей-офф" };
const formatDate = (value) => value ? new Date(value).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "2-digit", timeZone: "UTC" }) : "Свободный агент";
const getTopSkill = (ratings = {}) => {
  const [key, value] = Object.entries(ratings).sort((left, right) => right[1] - left[1])[0] || [];
  return key ? `${SKILL_LABELS[key] || key} ${value}` : "—";
};
const getBestPlayoffResult = (experience = {}) => {
  if (experience.championships) return "Чемпион";
  if (experience.finals) return "Финал";
  if (experience.semifinals) return "Полуфинал";
  if (experience.quarterFinals) return "1/4 финала";
  return experience.playoffAppearances ? "Плей-офф" : "Без плей-офф";
};
const renderCoachSummary = (coach) => `<div class="coach-summary">
  <div><span>Контракт</span><strong>${formatDate(coach.contractUntil)}</strong></div>
  <div><span>Стиль</span><strong>${coach.style}</strong></div>
  <div><span>Амбиции</span><strong>${coach.ambition || 65}</strong></div>
  <div><span>Сильная сторона</span><strong>${getTopSkill(coach.ratings)}</strong></div>
  <div><span>Опыт</span><strong>${coach.experience?.leagueSeasons || coach.seasonsCoached} сез. / ${coach.khlGamesCoached} игр</strong></div>
  <div><span>Плей-офф</span><strong>${coach.experience?.playoffAppearances || 0} раз</strong></div>
  <div><span>Лучший результат</span><strong>${getBestPlayoffResult(coach.experience)}</strong></div>
  <div><span>Кубки</span><strong>${coach.experience?.championships || 0}</strong></div>
</div>`;

export class CoachTabRenderer {
  render(view) {
    if (!view) return `<section class="coach-screen"><div class="coach-empty">Режим тренеров выключен.</div></section>`;
    const { coach, team, freeCoaches = [], fit = null, message = "", coachOffer = null } = view;
    if (!coach) return `<section class="coach-screen"><div class="coach-empty">Главный тренер не назначен.</div>${message ? `<div class="coach-management-message">${message}</div>` : ""}${renderCoachMarket(freeCoaches)}</section>`;
    return `<section class="coach-screen">
      <header class="coach-hero">
        <img class="coach-photo" src="${coach.photoUrl}" alt="${coach.name}" ${PHOTO_FALLBACK_ATTR}>
        <div class="coach-title"><span>Главный тренер · ${team?.name || ""}</span><h2>${coach.name}</h2><p>${coach.style} · ${coach.nationality}</p></div>
        <div class="coach-overall"><span>РЕЙТ</span><strong>${coach.overall}</strong></div>
      </header>
      ${renderCoachSummary(coach)}
      <div class="coach-board">${renderCoachFit(fit)}${renderCoachActions(coach, message, coachOffer)}</div>
      ${renderCoachMarket(freeCoaches)}
    </section>`;
  }
}
