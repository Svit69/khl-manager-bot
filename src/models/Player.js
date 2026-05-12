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
  get moodScore(){return this.#condition.moodScore}
  get moodState(){return this.#condition.moodState}
  get moodModifier(){
    if(this.moodScore>=30)return 1;
    return 1-((Math.max(0,30-this.moodScore)/30)*0.03);
  }
  get fatigueOvrPenalty(){
    const fatigue=Number(this.fatigueScore)||0;
    if(fatigue<=35)return 0;
    if(fatigue<=55)return 1+Math.floor((fatigue-36)/10);
    if(fatigue<=75)return 4+Math.floor((fatigue-56)/7);
    return Math.min(10,7+Math.floor((fatigue-76)/8));
  }
  get fatigueSkillPenalty(){return Math.max(0,Math.round(this.fatigueOvrPenalty*0.85))}
  get effectiveAttributesJson(){
    const penalty=this.fatigueSkillPenalty;
    const attrs=this.#attributes.attributesJson||{};
    if(!penalty)return {...attrs};
    return Object.fromEntries(Object.entries(attrs).map(([key,value])=>[
      key,
      typeof value==="number"?Math.max(40,Math.round(value-penalty)):value
    ]));
  }
  get currentOvr(){return Math.max(0,Math.round(this.ovr*this.moodModifier)-this.fatigueOvrPenalty)}
  getEfficiency(){
    const fatigueLevel=this.#condition.fatigueScore/25;
    return this.currentOvr*this.form*(1-0.03*fatigueLevel);
  }
  applyFatigue(deltaScore){this.#condition.applyFatigue(deltaScore)}
  applyFormDelta(delta){this.#condition.applyFormDelta(delta)}
  applyMoodDelta(delta){this.#condition.applyMoodDelta(delta)}
}
