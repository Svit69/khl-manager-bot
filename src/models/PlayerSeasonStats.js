export class PlayerSeasonStats{
  #seasonId;#playerId;#games;#goals;#assists;#points;#shots;#totalIceTime;
  constructor({seasonId,playerId,games=0,goals=0,assists=0,points=0,shots=0,totalIceTime=0}){
    this.#seasonId=seasonId;this.#playerId=playerId;this.#games=games;this.#goals=goals;this.#assists=assists;this.#points=points;this.#shots=shots;this.#totalIceTime=totalIceTime;
  }
  get seasonId(){return this.#seasonId}
  get playerId(){return this.#playerId}
  get games(){return this.#games}
  get goals(){return this.#goals}
  get assists(){return this.#assists}
  get points(){return this.#points}
  get shots(){return this.#shots}
  get totalIceTime(){return this.#totalIceTime}
  addGoal(){this.#goals++;this.#points++}
  addAssist(){this.#assists++;this.#points++}
}
