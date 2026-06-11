import { PHOTO_FALLBACK_ATTR } from "../utils/PlayerPhoto.js";
import { renderCoachFit } from "./CoachFitRenderer.js";

const RATING_LABELS = Object.freeze({
  tactics: "Tactics",
  offense: "Offense",
  defense: "Defense",
  discipline: "Discipline",
  playerDevelopment: "Player Development",
  lockerRoom: "Locker Room",
  conditioning: "Conditioning",
  playoffPoise: "Playoff Poise",
});

const formatDate = (value) => value ? new Date(value).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "2-digit", timeZone: "UTC" }) : "Свободный агент";

const renderRating = ([key, value]) => `<div class="coach-rating-row">
  <span>${RATING_LABELS[key] || key}</span><strong>${value}</strong><em style="width:${Math.max(0, Math.min(100, Number(value) || 0))}%"></em>
</div>`;

const renderFreeCoach = (coach) => `<div class="coach-market-row">
  <span>${coach.name}</span><strong>${coach.style}</strong><em>OVR ${coach.overall}</em>
</div>`;

export class CoachTabRenderer {
  render(view) {
    if (!view?.coach) return `<section class="coach-screen"><div class="coach-empty">Главный тренер не назначен.</div></section>`;
    const { coach, team, freeCoaches = [], fit = null } = view;
    const ratings = Object.entries(coach.ratings || {}).map(renderRating).join("");
    return `<section class="coach-screen">
      <header class="coach-hero">
        <img class="coach-photo" src="${coach.photoUrl}" alt="${coach.name}" ${PHOTO_FALLBACK_ATTR}>
        <div class="coach-title"><span>Head Coach • ${team?.name || ""}</span><h2>${coach.name}</h2><p>${coach.style} • ${coach.nationality} • ${coach.age || "—"} лет</p></div>
        <div class="coach-overall"><span>OVR</span><strong>${coach.overall}</strong></div>
      </header>
      <div class="coach-summary">
        <div><span>Contract</span><strong>${formatDate(coach.contractUntil)}</strong></div>
        <div><span>Seasons Coached</span><strong>${coach.seasonsCoached}</strong></div>
        <div><span>KHL Games</span><strong>${coach.khlGamesCoached}</strong></div>
        <div><span>Style</span><strong>${coach.style}</strong></div>
      </div>
      <div class="coach-board">
        <section class="coach-panel"><h3>Coach Attributes</h3>${ratings}</section>
        ${renderCoachFit(fit)}
        <section class="coach-panel"><h3>Available Coaches</h3>${freeCoaches.map(renderFreeCoach).join("") || `<div class="coach-empty">Свободных тренеров нет</div>`}</section>
      </div>
    </section>`;
  }
}
