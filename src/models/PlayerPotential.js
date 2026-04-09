export class PlayerPotential{
  #playerId;#potential;#growthRate;#peakAge;#declineRate;#developmentProgress;#potentialProgress;#freeAgentInactivityGames;
  constructor({playerId,potential,growthRate,peakAge,declineRate,developmentProgress=0,potentialProgress=0,freeAgentInactivityGames=0}){
    this.#playerId=playerId;this.#potential=potential;this.#growthRate=growthRate;this.#peakAge=peakAge;this.#declineRate=declineRate;this.#developmentProgress=developmentProgress;this.#potentialProgress=potentialProgress;this.#freeAgentInactivityGames=Math.max(0,Math.round(Number(freeAgentInactivityGames)||0));
  }
  get playerId(){return this.#playerId}
  get potential(){return this.#potential}
  get growthRate(){return this.#growthRate}
  get peakAge(){return this.#peakAge}
  get declineRate(){return this.#declineRate}
  get developmentProgress(){return this.#developmentProgress}
  get potentialProgress(){return this.#potentialProgress}
  get freeAgentInactivityGames(){return this.#freeAgentInactivityGames}
  addDevelopmentProgress(delta){this.#developmentProgress+=Number(delta)||0;return this.#developmentProgress}
  addPotentialProgress(delta){this.#potentialProgress+=Number(delta)||0;return this.#potentialProgress}
  addFreeAgentInactivity(games=1){this.#freeAgentInactivityGames=Math.max(0,this.#freeAgentInactivityGames+Math.max(0,Math.round(Number(games)||0)));return this.#freeAgentInactivityGames}
  resetFreeAgentInactivity(){this.#freeAgentInactivityGames=0;return this.#freeAgentInactivityGames}
  consumeDevelopmentStep(threshold){
    if(this.#developmentProgress>=threshold){this.#developmentProgress-=threshold;return 1;}
    if(this.#developmentProgress<=-threshold){this.#developmentProgress+=threshold;return -1;}
    return 0;
  }
  consumePotentialStep(threshold){
    if(this.#potentialProgress>=threshold){this.#potentialProgress-=threshold;return 1;}
    if(this.#potentialProgress<=-threshold){this.#potentialProgress+=threshold;return -1;}
    return 0;
  }
  adjustPotential(delta){
    this.#potential=Math.max(55,Math.min(99,Math.round(this.#potential+(Number(delta)||0))));
    return this.#potential;
  }
  importSnapshot(snapshot={}){
    if("potential" in snapshot)this.#potential=Math.max(55,Math.min(99,Math.round(Number(snapshot.potential)||this.#potential)));
    if("developmentProgress" in snapshot)this.#developmentProgress=Number(snapshot.developmentProgress)||0;
    if("potentialProgress" in snapshot)this.#potentialProgress=Number(snapshot.potentialProgress)||0;
    if("freeAgentInactivityGames" in snapshot)this.#freeAgentInactivityGames=Math.max(0,Math.round(Number(snapshot.freeAgentInactivityGames)||0));
  }
  exportSnapshot(){
    return {
      potential:this.#potential,
      growthRate:this.#growthRate,
      peakAge:this.#peakAge,
      declineRate:this.#declineRate,
      developmentProgress:this.#developmentProgress,
      potentialProgress:this.#potentialProgress,
      freeAgentInactivityGames:this.#freeAgentInactivityGames
    };
  }
}
