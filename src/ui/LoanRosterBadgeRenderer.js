import { loanEscape, loanDate } from "./LoanUiFormatting.js";

export const renderLoanRosterBadge = (loan) => {
  if (!loan) return "";
  const label = `Аренда. Клуб-владелец: ${loan.ownerTeamName || "не указан"}. До ${loanDate(loan.endDate)}; возврат: ${loan.returnDate ? loanDate(loan.returnDate) : "по окончании аренды"}`;
  return `<span class="hockey-card-loan" tabindex="0" role="img" title="${loanEscape(label)}" aria-label="${loanEscape(label)}"><span aria-hidden="true">&#8644;</span><span class="hockey-card-loan-tooltip" aria-hidden="true">${loanEscape(label)}</span></span>`;
};
