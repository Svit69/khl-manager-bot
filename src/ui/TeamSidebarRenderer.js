import { OptionalCoachNavigationItem } from "./OptionalCoachNavigationItem.js";
import { TeamNavigationItem } from "./TeamNavigationItem.js";

export class TeamSidebarRenderer {
  #navigationItems;

  constructor() {
    this.#navigationItems = [
      new TeamNavigationItem("roster", "Состав", "roster"),
      new OptionalCoachNavigationItem("coach", "Тренер", "coach"),
      new TeamNavigationItem("junior", "Молодежка", "junior"),
      new TeamNavigationItem("contracts", "Контракты", "contracts"),
      new TeamNavigationItem("teamStats", "Статистика", "statistics"),
      new TeamNavigationItem("transfers", "Движение", "transfers"),
      new TeamNavigationItem("freeAgents", "Свободные агенты", "free-agents"),
      new TeamNavigationItem("trades", "Обмены", "trades"),
      new TeamNavigationItem("legacy", "История", "legacy"),
    ];
  }

  render(_team, activeTab, settings = {}) {
    return `<aside class="team-sidebar"><div class="team-sidebar-brand"><span>ХОККЕЙНЫЙ</span><strong>МЕНЕДЖЕР</strong></div><div class="team-sidebar-nav">${this.#renderNavigation(activeTab, settings)}</div><div class="team-sidebar-bottom"><button id="resetBtn" class="team-sidebar-new-game" type="button">Новая игра</button></div></aside>`;
  }

  #renderNavigation(activeTab, settings) {
    return this.#navigationItems
      .filter((item) => item.isVisible(settings))
      .map((item) => item.render(activeTab))
      .join("");
  }
}
