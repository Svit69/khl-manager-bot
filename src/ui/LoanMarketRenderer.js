import { loanEscape as esc, loanSalary } from "./LoanUiFormatting.js";
import { PHOTO_FALLBACK_ATTR, PLACEHOLDER_PHOTO_URL } from "../utils/PlayerPhoto.js";

const renderTeamPicker = (view) => {
  const selected = view.teams.find(team => team.id === view.sourceTeamId);
  if (!selected) return "";
  return `<details class="trade-team-picker"><summary><span class="trade-team-picker-label">Клуб-владелец</span>
    <span class="trade-team-picker-current"><img src="${esc(selected.logoUrl)}" alt=""><strong>${esc(selected.name)}</strong></span></summary>
    <div class="trade-team-menu">${view.teams.map(team => `<button type="button" class="trade-team-option${team.id === view.sourceTeamId ? " active" : ""}"
      data-action="loan-select-team" data-team-id="${esc(team.id)}" aria-pressed="${team.id === view.sourceTeamId}">
      <img src="${esc(team.logoUrl)}" alt=""><span><strong>${esc(team.name)}</strong><small>Игроков: ${view.candidates.filter(player => player.ownerTeamId === team.id).length}</small></span></button>`).join("")}</div></details>`;
};

export const renderLoanMarket = (view) => `<section class="loan-market">
  ${renderTeamPicker(view)}<div class="trade-panel-head"><h3>Доступны для аренды</h3><span>${view.players.length}</span></div>
  <div class="trade-list loan-market-list">${view.players.map(player => `<button type="button"
    class="trade-player-row${player.playerId === view.playerId ? " selected" : ""}" data-action="loan-select-player"
    data-player-id="${esc(player.playerId)}" aria-pressed="${player.playerId === view.playerId}">
    <img class="trade-player-photo" src="${esc(player.photoUrl || PLACEHOLDER_PHOTO_URL)}" alt="" ${PHOTO_FALLBACK_ATTR}>
    <span class="trade-player-main"><span class="trade-player-name">${esc(player.displayName)}</span>
    <span class="trade-player-subtitle"><span>${esc(player.position)}</span><span>${player.age} лет</span><span>${loanSalary(player.salaryRub)}</span></span></span>
    <span class="trade-player-rating"><span class="trade-player-rating-label">ОБЩ</span><strong>${player.ovr}</strong></span></button>`).join("") ||
    '<div class="trade-summary-empty">Сейчас нет игроков, которых клубы готовы отдать в аренду.</div>'}</div></section>`;
