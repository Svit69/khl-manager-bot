import { TeamNavigationItem } from "./TeamNavigationItem.js";

export class OptionalCoachNavigationItem extends TeamNavigationItem {
  isVisible(settings = {}) {
    return settings.coachesEnabled !== false;
  }
}
