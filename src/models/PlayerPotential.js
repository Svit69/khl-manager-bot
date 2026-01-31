export class PlayerPotential{
  #playerId;#potential;#growthRate;#peakAge;#declineRate;
  constructor({playerId,potential,growthRate,peakAge,declineRate}){
    this.#playerId=playerId;this.#potential=potential;this.#growthRate=growthRate;this.#peakAge=peakAge;this.#declineRate=declineRate;
  }
  get playerId(){return this.#playerId}
  get potential(){return this.#potential}
  get growthRate(){return this.#growthRate}
  get peakAge(){return this.#peakAge}
  get declineRate(){return this.#declineRate}
}
