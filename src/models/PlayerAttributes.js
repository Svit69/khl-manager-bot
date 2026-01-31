export class PlayerAttributes{
  #playerId;#attributesJson;#ovr;
  constructor(playerId,attributesJson){
    this.#playerId=playerId;this.#attributesJson=attributesJson;this.#ovr=this.#calcOvr(attributesJson);
  }
  get playerId(){return this.#playerId}
  get attributesJson(){return this.#attributesJson}
  get ovr(){return this.#ovr}
  recalcOvr(){this.#ovr=this.#calcOvr(this.#attributesJson);return this.#ovr}
  #calcOvr(attrs){
    const values=Object.values(attrs).filter(v=>typeof v==="number");
    return Math.round(values.reduce((a,b)=>a+b,0)/values.length);
  }
}
