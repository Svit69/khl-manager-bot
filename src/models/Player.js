export class Player{
  #name;#attrs;#fatigue;#form;
  constructor(name,attrs){
    if(new.target===Player)throw new Error("Нельзя создавать Player напрямую");
    this.#name=name;this.#attrs=attrs;this.#fatigue=0;this.#form=1;
  }
  get name(){return this.#name}
  get attrs(){return this.#attrs}
  get fatigue(){return this.#fatigue}
  get form(){return this.#form}
  set fatigue(value){this.#fatigue=Math.max(0,Math.min(4,value))}
  set form(value){this.#form=Math.max(0.95,Math.min(1.05,value))}
  get ovr(){return Math.round(Object.values(this.#attrs).reduce((a,b)=>a+b,0)/Object.keys(this.#attrs).length)}
  getEfficiency(){return this.ovr*this.#form*(1-0.08*this.#fatigue)}
}
