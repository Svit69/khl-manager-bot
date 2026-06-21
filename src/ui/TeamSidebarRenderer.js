import { OptionalCoachNavigationItem } from "./OptionalCoachNavigationItem.js";
import { TeamNavigationItem } from "./TeamNavigationItem.js";

export class TeamSidebarRenderer {
  #navigationItems;

  constructor() {
    this.#navigationItems = [
      new TeamNavigationItem("roster", "Состав"),
      new OptionalCoachNavigationItem("coach", "Тренер"),
      new TeamNavigationItem("junior", "Молодежка"),
      new TeamNavigationItem("contracts", "Контракты"),
      new TeamNavigationItem("teamStats", "Статистика команды"),
      new TeamNavigationItem("transfers", "Движение"),
      new TeamNavigationItem("freeAgents", "Свободные агенты"),
      new TeamNavigationItem("trades", "Обмены"),
      new TeamNavigationItem("legacy", "История"),
    ];
  }

  render(team, activeTab, settings = {}) {
    return `<aside class="team-sidebar"><img class="team-sidebar-logo" src="${team.logoUrl}" alt="${team.name}"/><div class="team-sidebar-nav">${this.#renderNavigation(activeTab, settings)}</div></aside>`;
  }

  #renderNavigation(activeTab, settings) {
    return this.#navigationItems
      .filter((item) => item.isVisible(settings))
      .map((item) => item.render(activeTab))
      .join("");
  }
}
