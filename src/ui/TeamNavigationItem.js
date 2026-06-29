export class TeamNavigationItem {
  #id;
  #label;
  #icon;

  constructor(id, label, icon) {
    this.#id = id;
    this.#label = label;
    this.#icon = icon;
  }

  isVisible() {
    return true;
  }

  render(activeTab) {
    const activeClass = activeTab === this.#id ? " active" : "";
    return `<button class="team-nav-link${activeClass}" data-tab="${this.#id}"><span class="team-nav-icon team-nav-icon--${this.#icon}" aria-hidden="true"></span><span class="team-nav-label">${this.#label}</span></button>`;
  }
}
