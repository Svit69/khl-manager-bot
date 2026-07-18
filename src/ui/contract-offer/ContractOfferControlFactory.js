export class ContractOfferControlFactory {
  createYearButton({ playerId, years, selectedYears }) {
    const activeClass = selectedYears === years ? "active" : "";
    return `<button class="${activeClass}" data-action="set-offer-years" data-player-id="${playerId}" data-years="${years}">${years} г.</button>`;
  }

  createSalaryStepButton({ playerId, delta }) {
    const label = delta > 0 ? `+${delta}` : String(delta);
    return `<button data-action="adjust-offer-salary" data-player-id="${playerId}" data-delta-million="${delta}">${label}</button>`;
  }

  createSalaryPresetButton({ playerId, action, label }) {
    return `<button data-action="${action}" data-player-id="${playerId}">${label}</button>`;
  }
}
