export class Line{
  #players;#weight;
  constructor(players,weight){this.#players=players;this.#weight=weight}
  get players(){return this.#players}
  get weight(){return this.#weight}
  getStrength(){return this.#players.reduce((a,p)=>a+p.getEfficiency(),0)/this.#players.length*this.#weight}
}
