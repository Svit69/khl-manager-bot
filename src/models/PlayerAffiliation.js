export class PlayerAffiliation{
  #playerId;#teamId;#contractId;#acquiredDay;
  constructor({playerId,teamId=null,contractId=null,acquiredDay=null}){
    this.#playerId=playerId;
    this.#teamId=teamId;
    this.#contractId=contractId;
    this.#acquiredDay=acquiredDay;
  }
  get playerId(){return this.#playerId}
  get teamId(){return this.#teamId}
  get contractId(){return this.#contractId}
  get acquiredDay(){return this.#acquiredDay}
  set teamId(value){this.#teamId=value}
  set contractId(value){this.#contractId=value}
  set acquiredDay(value){this.#acquiredDay=value}
}
