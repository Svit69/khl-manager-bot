export class PlayerAttributes{
  #playerId;#attributesJson;#ovr;
  constructor(playerId,attributesJson){
    this.#playerId=playerId;this.#attributesJson={...attributesJson};this.#ovr=this.#calcOvr(this.#attributesJson);
  }
  get playerId(){return this.#playerId}
  get attributesJson(){return this.#attributesJson}
  get ovr(){return this.#ovr}
  recalcOvr(){this.#ovr=this.#calcOvr(this.#attributesJson);return this.#ovr}
  applyAttributeDelta(key,delta){
    if(!(key in this.#attributesJson))return this.#ovr;
    this.#attributesJson[key]=Math.max(40,Math.min(99,Math.round((this.#attributesJson[key]||0)+(Number(delta)||0))));
    return this.recalcOvr();
  }
  importSnapshot(snapshot={}){
    if(snapshot?.attributesJson && typeof snapshot.attributesJson==="object"){
      this.#attributesJson={...snapshot.attributesJson};
      this.recalcOvr();
    }
  }
  exportSnapshot(){return {attributesJson:{...this.#attributesJson},ovr:this.#ovr}}
  #calcOvr(attrs){
    const values=Object.values(attrs).filter(v=>typeof v==="number");
    return Math.round(values.reduce((a,b)=>a+b,0)/values.length);
  }
}
