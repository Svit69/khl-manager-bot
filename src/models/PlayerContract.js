export class PlayerContract{
  #id;#playerId;#teamId;#season;#salaryRub;#type;
  constructor({id,playerId,teamId,season,salaryRub,type}){
    this.#id=id;this.#playerId=playerId;this.#teamId=teamId;this.#season=season;this.#salaryRub=salaryRub;this.#type=type;
  }
  get id(){return this.#id}
  get playerId(){return this.#playerId}
  get teamId(){return this.#teamId}
  get season(){return this.#season}
  get salaryRub(){return this.#salaryRub}
  get type(){return this.#type}
}
