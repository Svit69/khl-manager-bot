export class PlayerCondition{
  #playerId;#fatigueScore;#fatigueStatus;#form;#injuryUntilDay;#moodScore;#moodState;
  constructor({playerId,fatigueScore,form,injuryUntilDay=null,moodScore=65}){
    this.#playerId=playerId;this.#fatigueScore=0;this.#fatigueStatus="green";this.#form=form;this.#injuryUntilDay=injuryUntilDay;this.#moodScore=65;this.#moodState="yellow";
    this.applyFatigue(fatigueScore||0);
    this.applyMoodDelta((Number(moodScore)||65)-65);
  }
  get playerId(){return this.#playerId}
  get fatigueScore(){return this.#fatigueScore}
  get fatigueStatus(){return this.#fatigueStatus}
  get form(){return this.#form}
  get injuryUntilDay(){return this.#injuryUntilDay}
  get moodScore(){return this.#moodScore}
  get moodState(){return this.#moodState}
  applyFatigue(delta){
    this.#fatigueScore=Math.max(0,Math.min(100,this.#fatigueScore+delta));
    this.#updateStatus();
  }
  applyFormDelta(delta){this.#form=Math.max(0.95,Math.min(1.05,this.#form+delta))}
  applyMoodDelta(delta){
    this.#moodScore=Math.max(0,Math.min(100,this.#moodScore+(Number(delta)||0)));
    this.#updateMoodState();
  }
  normalizeOffseason(){
    this.#fatigueScore=Math.max(0,Math.round(this.#fatigueScore*0.2));
    this.#form=0.99+(this.#form-0.99)*0.35;
    this.#moodScore=Math.round(this.#moodScore+(65-this.#moodScore)*0.45);
    this.#updateStatus();
    this.#updateMoodState();
  }
  #updateStatus(){
    if(this.#injuryUntilDay!==null){this.#fatigueStatus="injured";return;}
    if(this.#fatigueScore<=25)this.#fatigueStatus="green";
    else if(this.#fatigueScore<=50)this.#fatigueStatus="yellow";
    else if(this.#fatigueScore<=75)this.#fatigueStatus="orange";
    else this.#fatigueStatus="red";
  }
  #updateMoodState(){
    if(this.#moodScore>=75)this.#moodState="green";
    else if(this.#moodScore>=50)this.#moodState="yellow";
    else if(this.#moodScore>=30)this.#moodState="orange";
    else this.#moodState="red";
  }
}
