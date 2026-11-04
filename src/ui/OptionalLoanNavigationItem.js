import { TeamNavigationItem } from "./TeamNavigationItem.js";

export class OptionalLoanNavigationItem extends TeamNavigationItem {
  isVisible(settings = {}) {
    return settings.loansEnabled !== false;
  }
}
