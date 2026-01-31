export class PlayerCareer{
  #playerId;#khlGamesPlayed;#seasonsPlayed;#reputation;
  constructor({playerId,khlGamesPlayed,seasonsPlayed,reputation=0}){
    this.#playerId=playerId;this.#khlGamesPlayed=khlGamesPlayed;this.#seasonsPlayed=seasonsPlayed;this.#reputation=reputation;
  }
  get playerId(){return this.#playerId}
  get khlGamesPlayed(){return this.#khlGamesPlayed}
  get seasonsPlayed(){return this.#seasonsPlayed}
  get reputation(){return this.#reputation}
}
