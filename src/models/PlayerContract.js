export class PlayerContract{
  #id;#playerId;#teamId;#season;#salaryRub;
  constructor({id,playerId,teamId,season,salaryRub}){
    this.#id=id;this.#playerId=playerId;this.#teamId=teamId;this.#season=season;this.#salaryRub=salaryRub;
  }
  get id(){return this.#id}
  get playerId(){return this.#playerId}
  get teamId(){return this.#teamId}
  get season(){return this.#season}
  get salaryRub(){return this.#salaryRub}
}
