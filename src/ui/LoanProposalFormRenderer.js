import { loanEscape as esc, loanSalary, loanDate } from "./LoanUiFormatting.js";
import { PHOTO_FALLBACK_ATTR, PLACEHOLDER_PHOTO_URL } from "../utils/PlayerPhoto.js";

export const renderLoanProposalForm = (view) => {
  const player = view.player;
  if (!player) return '<section class="loan-preview"><h3>Условия аренды</h3><div class="trade-summary-empty">Нет доступных предложений</div></section>';
  const destination = view.destinations.find(entry => entry.teamId === view.borrowingTeamId);
  const reasons = destination?.reasons || [];
  const disabled = view.enabled === false || !destination?.eligible;
  const capTerms = view.capEnabled && Number.isFinite(destination?.projectedRub) && Number.isFinite(destination?.capRub)
    ? `<div><dt>Потолок после сделки</dt><dd>${loanSalary(destination.projectedRub)} / ${loanSalary(destination.capRub)}</dd></div>` : "";
  return `<section class="loan-preview" aria-labelledby="loan-preview-title"><h3 id="loan-preview-title">Условия аренды</h3>
    <div class="loan-preview-player"><img src="${esc(player.photoUrl || PLACEHOLDER_PHOTO_URL)}" alt="${esc(player.displayName)}" ${PHOTO_FALLBACK_ATTR}>
      <div><span class="trade-player-rating-label">ОБЩ</span><strong>${player.ovr}</strong></div></div>
    <h4>${esc(player.displayName)}</h4><p>${esc(player.position)} / ${player.age} лет / ${esc(player.ownerTeamName)}</p>
    <dl class="loan-preview-terms"><div><dt>Зарплата за сезон</dt><dd>${loanSalary(player.salaryRub)}</dd></div>
      <div><dt>Компенсация клубу</dt><dd>Без компенсации</dd></div>
      <div><dt>Аренда до</dt><dd>${loanDate(view.endDate)}</dd></div>
      <div><dt>Возврат в ${esc(player.ownerTeamName)}</dt><dd>${loanDate(view.returnDate)}</dd></div>${capTerms}</dl>
    <button type="button" class="btn" data-action="loan-submit"${disabled ? " disabled" : ""} aria-describedby="loan-disabled-reasons">Запросить аренду</button>
    <div id="loan-disabled-reasons" class="loan-reasons">${reasons.map(esc).join(" ")}</div></section>`;
};
