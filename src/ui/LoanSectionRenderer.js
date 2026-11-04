import { loanEscape as esc } from "./LoanUiFormatting.js";
import { renderLoanProposalForm } from "./LoanProposalFormRenderer.js";
import { renderLoanAgreements } from "./LoanAgreementRenderer.js";
import { renderLoanMarket } from "./LoanMarketRenderer.js";

export const renderLoanSection = (view) => {
  if (!view) return "";
  return `<section class="loan-section loan-screen" aria-labelledby="loan-section-title">
    <header class="loan-screen-heading"><div><h2 id="loan-section-title">Аренды</h2><span>Сезон ${esc(view.seasonLabel || "")}</span></div>
      <div class="loan-market-total">Клубов: <strong>${view.teams?.length || 0}</strong> / Игроков: <strong>${view.candidates?.length || 0}</strong></div></header>
    ${view.message ? `<div class="loan-feedback" role="status" aria-live="polite">${esc(view.message)}</div>` : ""}
    ${view.enabled === false ? '<div class="trade-summary-empty">Аренды отключены в настройках карьеры.</div>' : `<div class="loan-market-grid">
      ${renderLoanMarket(view)}${renderLoanProposalForm(view)}</div>`}
    ${renderLoanAgreements("Входящие предложения", view.proposals, true, view.enabled !== false)}
    <div class="loan-agreement-columns">${renderLoanAgreements("Взяты в аренду", view.incoming, false, view.enabled !== false)}${renderLoanAgreements("Отданы в аренду", view.outgoing, false, view.enabled !== false)}</div>
  </section>`;
};
