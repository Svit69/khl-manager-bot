import { BaseContractOfferControlPanel } from "./BaseContractOfferControlPanel.js";

export class RenewalContractOfferControlPanel extends BaseContractOfferControlPanel {
  isSubmitDisabled(preview) {
    return Boolean(preview.isRenewalLocked);
  }

  renderLockNotice(preview) {
    return preview.isRenewalLocked
      ? `<div class="contract-offer-control-panel__outcome">${preview.renewalLockReason}</div>`
      : "";
  }
}
