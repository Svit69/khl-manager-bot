export class Player{
  #identity;#attributes;#potential;#condition;#career;#affiliation;#seasonStats;
  constructor(identity,attributes,potential,condition,career,affiliation,seasonStats){
    if(new.target===Player)throw new Error("Нельзя создавать Player напрямую");
    this.#identity=identity;this.#attributes=attributes;this.#potential=potential;this.#condition=condition;
    this.#career=career;this.#affiliation=affiliation;this.#seasonStats=seasonStats;
  }
  get identity(){return this.#identity}
  get id(){return this.#identity.id}
  get attributes(){return this.#attributes}
  get potential(){return this.#potential}
  get condition(){return this.#condition}
  get career(){return this.#career}
  get affiliation(){return this.#affiliation}
  get seasonStats(){return this.#seasonStats}
  get name(){return this.#identity.displayName}
  get ovr(){return this.#attributes.ovr}
  get form(){return this.#condition.form}
  get fatigueScore(){return this.#condition.fatigueScore}
  get fatigueStatus(){return this.#condition.fatigueStatus}
  getEfficiency(){
    const fatigueLevel=this.#condition.fatigueScore/25;
    return this.ovr*this.form*(1-0.08*fatigueLevel);
  }
  applyFatigue(deltaScore){this.#condition.applyFatigue(deltaScore)}
  applyFormDelta(delta){this.#condition.applyFormDelta(delta)}
}
