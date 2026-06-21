export class TeamNavigationItem {
  #id;
  #label;

  constructor(id, label) {
    this.#id = id;
    this.#label = label;
  }

  isVisible() {
    return true;
  }

  render(activeTab) {
    const activeClass = activeTab === this.#id ? " active" : "";
    return `<button class="team-nav-link${activeClass}" data-tab="${this.#id}">${this.#label}</button>`;
  }
}
