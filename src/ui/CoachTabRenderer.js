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
const percent = (value) => Math.max(0, Math.min(100, Number(value) || 0));
const formatBoost = (value) => `${value >= 0 ? "+" : ""}${value}`;
const getSupplementalCoachPhotoUrl = (photoUrl = "") => {
  const source = String(photoUrl || "");
  const match = source.match(/^(.*?)(\.[a-z0-9]+)$/i);
  return source.includes("/coach-photo/") && match ? `${match[1]}_dop${match[2]}` : "";
};
const getEffectBoosts = (effect = {}) => [
  ["Атака", Math.round(((Number(effect.attackMultiplier) || 1) - 1) * 100)],
  ["Защита", Math.round(((Number(effect.defenseMultiplier) || 1) - 1) * 100)],
  ["Развитие игроков", Math.round(((Number(effect.developmentMultiplier) || 1) - 1) * 100)],
  ["Дисциплина", Math.round((1 - (Number(effect.penaltyMultiplier) || 1)) * 100)],
];
const renderCoachInfo = (coach, fit) => [
  ["Контракт до:", formatDate(coach.contractUntil)],
  ["Опыт:", `${coach.experience?.leagueSeasons || coach.seasonsCoached || 0} сезонов`],
  ["Выходов в плей-офф:", `${coach.experience?.playoffAppearances || 0}`],
  ["Лучший результат:", getBestPlayoffResult(coach.experience)],
  ["Кубков:", `${coach.experience?.championships || 0}`],
  ["Соответствие составу:", `${percent(fit?.teamFit)}%`],
].map(([label, value]) => `<div class="coach-profile-info-row"><span>${label}</span><strong>${value}</strong></div>`).join("");
const renderCoachFitMeter = (fit) => {
  const score = percent(fit?.teamFit);
  return `<div class="coach-profile-fit">
    <span>Соответствие составу</span>
    <div class="coach-profile-gauge" style="--fit:${score}">
      <strong>${score}%</strong>
      <small class="coach-profile-gauge-min">0%</small>
      <small class="coach-profile-gauge-max">100%</small>
    </div>
  </div>`;
};
const renderCoachBonuses = (fit) => `<div class="coach-profile-bonuses"><span>Бонусы тренера</span><div>${getEffectBoosts(fit?.effect).map(([label, value]) => `<small><b>${label}</b><strong>${formatBoost(value)}</strong></small>`).join("")}</div></div>`;
const renderCoachProfileShade = (coach) => {
  const supplementalPhotoUrl = getSupplementalCoachPhotoUrl(coach.photoUrl);
  const photo = supplementalPhotoUrl ? `<img class="coach-profile-shade-photo" src="${supplementalPhotoUrl}" alt="" aria-hidden="true" onerror="this.remove()">` : "";
  return `<div class="coach-profile-shade">${photo}</div>`;
};
const renderCoachProfile = (coach, fit) => `<section class="coach-profile-card">
  <div class="coach-profile-photo-panel">
    <img class="coach-profile-bg" src="./coach-background/coach-red.png" alt="" aria-hidden="true">
    <img class="coach-profile-photo" src="${coach.photoUrl}" alt="${coach.name}" ${PHOTO_FALLBACK_ATTR}>
    ${renderCoachProfileShade(coach)}
    <div class="coach-profile-rating"><span>Рейтинг</span><strong>${coach.overall}</strong><small>★★★</small></div>
    <div class="coach-profile-caption">
      <h3>${String(coach.name || "").toUpperCase()}</h3>
      <span>ГЛАВНЫЙ ТРЕНЕР</span>
      <small>В КЛУБЕ С <strong>МАЙ 2024</strong></small>
    </div>
  </div>
  <div class="coach-profile-info">${renderCoachInfo(coach, fit)}${renderCoachFitMeter(fit)}${renderCoachBonuses(fit)}</div>
</section>`;
const renderCoachToolbar = () => `<div class="coach-tab-switcher"><button class="active">ГЛАВНЫЙ ТРЕНЕР</button><button>АССИСТЕНТЫ</button><button>РЫНОК ТРЕНЕРОВ</button></div>`;
const renderCoachProfileActions = (message = "") => `<div class="coach-profile-actions">
  <button class="coach-action" data-action="coach-renew" data-years="2">ПРОДЛИТЬ КОНТРАКТ</button>
  <button class="coach-action danger" data-action="coach-terminate">РАСТОРГНУТЬ КОНТРАКТ</button>
  ${message ? `<div class="coach-management-message">${message}</div>` : ""}
</div>`;
const renderCoachProfileShell = (coach, fit, message) => `<section class="coach-profile-shell">${renderCoachProfile(coach, fit)}${renderCoachProfileActions(message)}</section>`;

export class CoachTabRenderer {
  render(view) {
    if (!view) return `<section class="coach-screen"><div class="coach-empty">Режим тренеров выключен.</div></section>`;
    const { coach, freeCoaches = [], fit = null, message = "" } = view;
    if (!coach) return `<section class="coach-screen">${renderCoachToolbar()}<div class="coach-empty">Главный тренер не назначен.</div>${message ? `<div class="coach-management-message">${message}</div>` : ""}${renderCoachMarket(freeCoaches)}</section>`;
    return `<section class="coach-screen">
      ${renderCoachToolbar()}
      ${renderCoachProfileShell(coach, fit, message)}
      ${renderCoachMarket(freeCoaches)}
    </section>`;
  }
}
