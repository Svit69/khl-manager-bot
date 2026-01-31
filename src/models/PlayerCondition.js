export class PlayerCondition{
  #playerId;#fatigueScore;#fatigueStatus;#form;#injuryUntilDay;
  constructor({playerId,fatigueScore,form,injuryUntilDay=null}){
    this.#playerId=playerId;this.#fatigueScore=0;this.#fatigueStatus="green";this.#form=form;this.#injuryUntilDay=injuryUntilDay;
    this.applyFatigue(fatigueScore||0);
  }
  get playerId(){return this.#playerId}
  get fatigueScore(){return this.#fatigueScore}
  get fatigueStatus(){return this.#fatigueStatus}
  get form(){return this.#form}
  get injuryUntilDay(){return this.#injuryUntilDay}
  applyFatigue(delta){
    this.#fatigueScore=Math.max(0,Math.min(100,this.#fatigueScore+delta));
    this.#updateStatus();
  }
  applyFormDelta(delta){this.#form=Math.max(0.95,Math.min(1.05,this.#form+delta))}
  #updateStatus(){
    if(this.#injuryUntilDay!==null){this.#fatigueStatus="injured";return;}
    if(this.#fatigueScore<=25)this.#fatigueStatus="green";
    else if(this.#fatigueScore<=50)this.#fatigueStatus="yellow";
    else if(this.#fatigueScore<=75)this.#fatigueStatus="orange";
    else this.#fatigueStatus="red";
  }
}
