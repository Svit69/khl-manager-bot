import { ContractOfferControlFactory } from "./ContractOfferControlFactory.js";

export class ContractOfferSalaryControlRenderer {
  #controlFactory;
  #formatter;

  constructor(formatter, controlFactory = new ContractOfferControlFactory()) {
    this.#formatter = formatter;
    this.#controlFactory = controlFactory;
  }

  renderSalaryInput({ playerId, salaryRub }) {
    return `<button data-action="adjust-offer-salary" data-player-id="${playerId}" data-delta-million="-1">−</button><input id="salary-input-${playerId}" type="number" min="0.5" step="0.5" value="${this.#formatter.formatMillionsInput(salaryRub)}" data-action="set-offer-salary-input" data-player-id="${playerId}"><span>млн ₽</span><button data-action="adjust-offer-salary" data-player-id="${playerId}" data-delta-million="1">+</button>`;
  }

  renderSalaryButtons(playerId) {
    const steps = [-5, -1, 1, 5]
      .map((delta) => this.#controlFactory.createSalaryStepButton({ playerId, delta }))
      .join("");
    return steps
      + this.#controlFactory.createSalaryPresetButton({ playerId, action: "set-offer-demand-salary", label: "Ожидание" })
      + this.#controlFactory.createSalaryPresetButton({ playerId, action: "set-offer-market-salary", label: "Рынок" });
  }
}
