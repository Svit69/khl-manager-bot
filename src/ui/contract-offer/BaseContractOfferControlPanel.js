import { ContractOfferFormattingService } from "./ContractOfferFormattingService.js";
import { ContractOfferControlFactory } from "./ContractOfferControlFactory.js";
import { ContractOfferNegotiationContextRenderer } from "./ContractOfferNegotiationContextRenderer.js";
import { ContractOfferPanelSectionsRenderer } from "./ContractOfferPanelSectionsRenderer.js";
import { ContractOfferSalaryControlRenderer } from "./ContractOfferSalaryControlRenderer.js";

export class BaseContractOfferControlPanel {
  #formatter;#controlFactory;#contextRenderer;#sectionsRenderer;#salaryRenderer;

  constructor(formatter = new ContractOfferFormattingService(), controlFactory = new ContractOfferControlFactory()) {
    this.#formatter = formatter;this.#controlFactory = controlFactory;
    this.#contextRenderer = new ContractOfferNegotiationContextRenderer(formatter);this.#sectionsRenderer = new ContractOfferPanelSectionsRenderer();
    this.#salaryRenderer = new ContractOfferSalaryControlRenderer(formatter, controlFactory);
  }

  render(negotiation) {
    const preview = negotiation.preview;
    const offer = negotiation.offer;
    const chance = this.#formatter.calculateAcceptanceChance(preview);
    const submitDisabled = this.isSubmitDisabled(preview) ? "disabled" : "";
    const playerId = preview.playerId;
    return `<div class="contract-offer-control-panel">
      ${this.#contextRenderer.render(preview, offer)}
      <div class="contract-offer-control-panel__main">
        ${this.#sectionsRenderer.renderTermSection({ panel: this, playerId, years: offer.years })}
        ${this.#sectionsRenderer.renderSalarySection({ salaryRenderer: this.#salaryRenderer, playerId, salaryRub: offer.salaryRub })}
        ${this.#sectionsRenderer.renderChanceSection({ chance, chanceProgress: `${chance}%`, caption: this.getChanceCaption(preview) })}
      </div>
      ${this.renderLockNotice(preview)}
      ${negotiation.outcome ? `<div class="contract-offer-control-panel__outcome">Ответ: ${negotiation.outcome}</div>` : ""}
      ${this.#sectionsRenderer.renderActions({ playerId, submitDisabled })}
    </div>`;
  }

  renderYearButtons(playerId, selectedYears) {
    return [1, 2, 3, 4]
      .map((years) => this.#controlFactory.createYearButton({ playerId, years, selectedYears }))
      .join("");
  }

  getChanceCaption(preview) {
    return preview.state?.chance >= 50 ? "Вероятно примет" : "Нужно улучшить";
  }

  isSubmitDisabled() { return false; }

  renderLockNotice() { return ""; }
}
