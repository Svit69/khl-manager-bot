import { loanEscape as esc, loanDate } from "./LoanUiFormatting.js";
import { renderLoanProposalForm } from "./LoanProposalFormRenderer.js";
import { renderLoanAgreements } from "./LoanAgreementRenderer.js";
export const renderLoanSection = (view) => {
  if (!view) return "";
  return `<section class="loan-section" aria-labelledby="loan-section-title">
    <header><h3 id="loan-section-title">Аренды игроков</h3><span>${esc(view.seasonLabel || "")}</span></header>
    <ul class="loan-rules">
      <li>До 24 лет включительно по году начала сезона; дедлайн: 25 января</li>
      <li>До 4 входящих и 4 исходящих одновременно, в каждом направлении не более одного игрока 23-24 лет; между двумя клубами: до 2 аренд за сезон</li>
      <li>Согласие обоих клубов и игрока; основной контракт у владельца, минимум на следующий сезон</li>
      <li>Без платы за переход; возврат: ${view.returnDate ? loanDate(view.returnDate) : "по окончании аренды"}</li>
      <li>Потолок: полная сезонная ставка у арендатора, без пересчёта за период; у владельца на время аренды исключается</li>
    </ul>
    ${view.message ? `<div class="loan-feedback" role="status" aria-live="polite">${esc(view.message)}</div>` : ""}
    ${renderLoanProposalForm(view)}
    ${renderLoanAgreements("Предложения", view.proposals, true, view.enabled !== false)}
    <div class="loan-agreement-columns">${renderLoanAgreements("Входящие аренды", view.incoming, false, view.enabled !== false)}${renderLoanAgreements("Исходящие аренды", view.outgoing, false, view.enabled !== false)}</div>
  </section>`;
};
