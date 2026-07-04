import { PHOTO_FALLBACK_ATTR } from "../utils/PlayerPhoto.js";

const shortSeason = (season = "") => String(season || "—").replace(/^(\d{4})\/20(\d{2})$/, "$1/$2");
const surname = (name = "") => String(name || "—").trim().split(/\s+/).slice(-1)[0].toUpperCase();

const renderTeamRow = (row, team) => `<div class="legacy-league-row">
  <span>${shortSeason(row.seasonLabel)}</span>
  ${team?.logoUrl ? `<img src="${team.logoUrl}" alt="${team.name}">` : `<i></i>`}
  <strong>${team?.name || "—"}</strong>
</div>`;

const renderScorerRow = (row) => {
  const scorer = row.topScorer;
  return `<div class="legacy-league-row scorer">
    <span>${shortSeason(row.seasonLabel)}</span>
    <img class="legacy-league-player-photo" src="${scorer?.photoUrl || "./player-photo/default.png"}" alt="${scorer?.name || "Игрок"}" ${PHOTO_FALLBACK_ATTR}>
    <strong>${surname(scorer?.name)}</strong>
    ${scorer?.team?.logoUrl ? `<img class="legacy-league-team-logo" src="${scorer.team.logoUrl}" alt="${scorer.team.name}">` : `<i></i>`}
    <b>${scorer?.points || 0}</b>
  </div>`;
};

const renderColumn = (title, icon, rows, getContent) => `<section class="legacy-league-column">
  <h3><span>${icon}</span>${title}</h3>
  <div class="legacy-league-list">${rows.length ? rows.map(getContent).join("") : `<div class="legacy-empty">История появится после завершения сезона.</div>`}</div>
</section>`;

export const renderLeagueHistory = (league = {}) => {
  const rows = league.champions || [];
  return `<section class="legacy-league-history">
    ${renderColumn("Обладатели Кубка Гагарина", "♕", rows, (row) => renderTeamRow(row, row.champion))}
    ${renderColumn("Победители регулярного чемпионата", "☆", rows, (row) => renderTeamRow(row, row.regularWinner))}
    ${renderColumn("Лучший бомбардир всего сезона", "◎", rows, renderScorerRow)}
  </section>`;
};
