import { ContractOfferFormattingService } from "./ContractOfferFormattingService.js";

export class ContractOfferNegotiationContextRenderer {
  #formatter;

  constructor(formatter = new ContractOfferFormattingService()) {
    this.#formatter = formatter;
  }

  render(preview, offer) {
    return `${this.#renderSalaryCapHint(preview.salaryCap, offer.salaryRub)}${this.#renderReasons(preview.reasons)}`;
  }

  #renderSalaryCapHint(cap, offerSalaryRub = 0) {
    if (!cap?.enabled) return "";
    const payroll = Number(cap.payrollRub) || 0;
    const projected = this.#formatter.formatMillions(payroll + (Number(offerSalaryRub) || 0));
    const stateClass = cap.offerFits ? "ok" : "danger";
    return `<div class="negotiation-cap-hint ${stateClass}"><div><span>Потолок ${cap.seasonLabel}</span><strong>${this.#formatter.formatMillions(cap.payrollRub)} / ${this.#formatter.formatMillions(cap.capRub)} млн</strong></div><div><span>Можно предложить</span><strong>${this.#formatter.formatMillions(cap.remainingRub)} млн</strong></div><div><span>После оффера</span><strong>${projected} млн</strong></div></div>`;
  }

  #renderReasons(reasons = []) {
    const content = reasons
      .map((reason) => this.#renderReason(reason))
      .join("");
    return content ? `<div class="negotiation-reasons">${content}</div>` : "";
  }

  #renderReason(reason) {
    const value = Number(reason.value) || 0;
    const sign = value >= 0 ? "+" : "";
    const tone = value >= 0 ? "pos" : "neg";
    return `<div class="negotiation-reason ${tone}">${sign}${value} ${reason.text}</div>`;
  }
}
