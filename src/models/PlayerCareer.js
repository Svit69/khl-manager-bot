export class PlayerCareer{
  #playerId;#khlGamesPlayed;#seasonsPlayed;#reputation;
  constructor({playerId,khlGamesPlayed,seasonsPlayed,reputation=0}){
    this.#playerId=playerId;
    this.#khlGamesPlayed=khlGamesPlayed;
    this.#seasonsPlayed=seasonsPlayed;
    this.#reputation=reputation;
  }
  get playerId(){return this.#playerId}
  get khlGamesPlayed(){return this.#khlGamesPlayed}
  get seasonsPlayed(){return this.#seasonsPlayed}
  get reputation(){return this.#reputation}
  addGames(count=0){
    this.#khlGamesPlayed+=Math.max(0,Number(count)||0);
    return this.#khlGamesPlayed;
  }
  addSeason(count=1){
    this.#seasonsPlayed+=Math.max(0,Number(count)||0);
    return this.#seasonsPlayed;
  }
  importSnapshot(snapshot={}){
    if("khlGamesPlayed" in snapshot)this.#khlGamesPlayed=Math.max(0,Number(snapshot.khlGamesPlayed)||0);
    if("seasonsPlayed" in snapshot)this.#seasonsPlayed=Math.max(0,Number(snapshot.seasonsPlayed)||0);
    if("reputation" in snapshot)this.#reputation=Math.max(0,Number(snapshot.reputation)||0);
  }
  exportSnapshot(){
    return {
      khlGamesPlayed:this.#khlGamesPlayed,
      seasonsPlayed:this.#seasonsPlayed,
      reputation:this.#reputation
    };
  }
}
