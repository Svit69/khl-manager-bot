import { loanEscape as esc, loanSalary, loanDate } from "./LoanUiFormatting.js";
const statusLabels = { pending: "Ожидает решения", accepted: "Согласовано", rejected: "Отклонено", expired: "Истекло", cancelled: "Отменено", active: "Действует", terminated: "Завершено" };
export const renderLoanAgreements = (title, rows = [], proposals = false, enabled = true) => `<section class="loan-list"><h4>${esc(title)} <span>${rows.length}</span></h4>${rows.map((row) => {
  const pending = proposals && row.status === "pending";
  const needsDecision = pending && row.requiresUserApproval;
  const reason = proposals ? row.message || (needsDecision && row.canAccept === false ? "Предложение больше не соответствует условиям аренды." : "") : row.terminationReason;
  const acceptDisabled = !enabled || row.canAccept === false;
  return `<article class="loan-row">
    <div class="loan-player"><strong>${esc(row.displayName)}</strong><span>${esc(row.ownerTeamName)} → ${esc(row.borrowingTeamName)}</span></div>
    <div class="loan-row-terms"><span>До ${loanDate(row.endDate)}</span><span>Возврат: ${row.returnDate ? loanDate(row.returnDate) : "по окончании аренды"}</span><span>Ставка за сезон: ${loanSalary(row.salaryRub)}</span></div>
    <div class="loan-row-status"><strong>${esc(proposals ? statusLabels[row.status] || row.status : "В аренде")}</strong><span>${esc(row.consentLabel || (proposals ? pending ? "Требуется согласие клубов и игрока" : "Решение по предложению принято" : "Клубы и игрок согласовали аренду"))}</span></div>
    <div class="loan-row-actions">${needsDecision ? `<button class="btn" data-action="loan-accept" data-loan-id="${esc(row.id)}"${acceptDisabled ? " disabled" : ""}>Принять</button><button class="btn secondary" data-action="loan-reject" data-loan-id="${esc(row.id)}"${!enabled ? " disabled" : ""}>Отклонить</button>` : pending ? '<span class="muted">Ожидается ответ клуба</span>' : ""}${!proposals ? `<button class="btn secondary" data-action="loan-terminate" data-loan-id="${esc(row.id)}"${!enabled || !row.canTerminate ? " disabled" : ""}>Завершить аренду</button>` : ""}</div>
    ${reason ? `<div class="loan-row-reason">${esc(reason)}</div>` : ""}
  </article>`;
}).join("") || '<p class="muted">Нет записей</p>'}</section>`;
