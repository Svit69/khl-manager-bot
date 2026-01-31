export class PlayerAffiliation{
  #playerId;#teamId;#contractId;
  constructor({playerId,teamId=null,contractId=null}){this.#playerId=playerId;this.#teamId=teamId;this.#contractId=contractId}
  get playerId(){return this.#playerId}
  get teamId(){return this.#teamId}
  get contractId(){return this.#contractId}
  set teamId(value){this.#teamId=value}
  set contractId(value){this.#contractId=value}
}
