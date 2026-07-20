export class GoalieAttributes {
  #reaction;#positioning;#athleticism;#puckControl;#mental;
  constructor({ reaction, positioning, athleticism, puckControl, mental }) { this.#reaction = reaction;this.#positioning = positioning;this.#athleticism = athleticism;this.#puckControl = puckControl;this.#mental = mental; }
  toJson() { return { reaction: this.#reaction, positioning: this.#positioning, athleticism: this.#athleticism, puckControl: this.#puckControl, mental: this.#mental }; }
}
