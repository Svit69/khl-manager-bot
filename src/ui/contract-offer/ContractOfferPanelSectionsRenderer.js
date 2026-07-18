export class ContractOfferPanelSectionsRenderer {
  renderTermSection({ panel, playerId, years }) {
    return `<section class="contract-offer-control-panel__term">
      <h4>Ваше предложение</h4>
      <span>Срок контракта</span>
      <div class="contract-offer-control-panel__years">${panel.renderYearButtons(playerId, years)}</div>
    </section>`;
  }

  renderSalarySection({ salaryRenderer, playerId, salaryRub }) {
    return `<section class="contract-offer-control-panel__salary">
      <span>Зарплата в год</span>
      <div class="contract-offer-control-panel__salary-box">${salaryRenderer.renderSalaryInput({ playerId, salaryRub })}</div>
      <div class="contract-offer-control-panel__salary-steps">${salaryRenderer.renderSalaryButtons(playerId)}</div>
    </section>`;
  }

  renderChanceSection({ chance, chanceProgress, caption }) {
    return `<section class="contract-offer-control-panel__chance">
      <span>Вероятность принятия</span>
      <div class="contract-offer-control-panel__chance-ring" style="--chance:${chanceProgress}">
        <strong>${chance}%</strong>
      </div>
      <b>${caption}</b>
    </section>`;
  }

  renderActions({ playerId, submitDisabled }) {
    return `<div class="contract-offer-control-panel__actions">
      <button class="contract-offer-control-panel__submit" ${submitDisabled} data-action="submit-offer" data-player-id="${playerId}"><span>↗</span>Отправить оффер</button>
      <button class="contract-offer-control-panel__close" data-action="close-negotiation" data-player-id="${playerId}">Закрыть</button>
    </div>`;
  }
}
