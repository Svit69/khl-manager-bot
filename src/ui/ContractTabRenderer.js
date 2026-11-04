import { renderExternalRightsPanel } from "./ExternalRightsCardRenderer.js";
import { renderContractFinanceHeader } from "./ContractFinanceRenderer.js";
import { renderContractPlayerCard } from "./ContractPlayerCardRenderer.js";
import { ContractRestrictedRightsRenderer } from "./ContractRestrictedRightsRenderer.js";
import { RenewalContractOfferControlPanel } from "./contract-offer/RenewalContractOfferControlPanel.js";

export class ContractTabRenderer {
  #contractOfferControlPanel = new RenewalContractOfferControlPanel();
  #restrictedRightsRenderer = new ContractRestrictedRightsRenderer();

  render(rows, negotiation, restrictedRights = [], externalPlayers = [], salaryCap = null) {
    const restrictedMarkup = this.#renderRestrictedRights(restrictedRights);
    const externalMarkup = this.#renderExternalPlayers(externalPlayers);
    const capMarkup = renderContractFinanceHeader(salaryCap);
    const content = rows
      .map((row) => {
        const status = row.freeAgentStatus || this.#formatStatus(row.age, row.khlGamesPlayed);
        const negotiationPanel =
          negotiation && negotiation.playerId === row.playerId ? this.#contractOfferControlPanel.render(negotiation) : "";
        return `<div class="contract-card">${renderContractPlayerCard(row, () => status)}${negotiationPanel}</div>`;
      })
      .join("");

    return `<section class="contracts-screen">${capMarkup}${restrictedMarkup}${externalMarkup}<div class="contract-grid">${content || '<div class="muted">Игроки не найдены</div>'}</div></section>`;
  }

  #renderExternalPlayers(rows) {
    return renderExternalRightsPanel(rows || []);
  }

  #renderRestrictedRights(rows) {
    return this.#restrictedRightsRenderer.render(rows);
  }

  #formatStatus(age, khlGamesPlayed) {
    if (age >= 29) return "НСА";
    if (age >= 28 && (khlGamesPlayed || 0) >= 250) return "НСА";
    return "ОСА";
  }
}
