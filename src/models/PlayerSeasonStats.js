export class PlayerSeasonStats{
  #seasonId;#playerId;#games;#goals;#assists;#points;#shots;#totalIceTime;#penaltyMinutes;#plusMinus;#shotsAgainst;#saves;#goalsAgainst;#shutouts;#qualityStarts;
  constructor({seasonId,playerId,games=0,goals=0,assists=0,points=0,shots=0,totalIceTime=0,penaltyMinutes=0,plusMinus=0,shotsAgainst=0,saves=0,goalsAgainst=0,shutouts=0,qualityStarts=0}){
    this.#seasonId=seasonId;this.#playerId=playerId;this.#games=games;this.#goals=goals;this.#assists=assists;this.#points=points;this.#shots=shots;this.#totalIceTime=totalIceTime;this.#penaltyMinutes=penaltyMinutes;this.#plusMinus=plusMinus;this.#shotsAgainst=shotsAgainst;this.#saves=saves;this.#goalsAgainst=goalsAgainst;this.#shutouts=shutouts;this.#qualityStarts=qualityStarts;
  }
  get seasonId(){return this.#seasonId}
  get playerId(){return this.#playerId}
  get games(){return this.#games}
  get goals(){return this.#goals}
  get assists(){return this.#assists}
  get points(){return this.#points}
  get shots(){return this.#shots}
  get totalIceTime(){return this.#totalIceTime}
  get penaltyMinutes(){return this.#penaltyMinutes}
  get plusMinus(){return this.#plusMinus}
  get shotsAgainst(){return this.#shotsAgainst}
  get saves(){return this.#saves}
  get goalsAgainst(){return this.#goalsAgainst}
  get shutouts(){return this.#shutouts}
  get qualityStarts(){return this.#qualityStarts}
  get savePercentage(){return this.#shotsAgainst?Math.round((this.#saves/this.#shotsAgainst)*1000)/1000:0}
  addGame(){this.#games++}
  addGoal(){this.#goals++;this.#points++}
  addAssist(){this.#assists++;this.#points++}
  addShot(count=1){this.#shots+=Math.max(0,Number(count)||0)}
  addIceTime(seconds=0){this.#totalIceTime+=Math.max(0,Number(seconds)||0)}
  addPenaltyMinutes(minutes=0){this.#penaltyMinutes+=Math.max(0,Number(minutes)||0)}
  applyMatch({games=1,goals=0,assists=0,shots=0,totalIceTime=0,penaltyMinutes=0,plusMinus=0,shotsAgainst=0,saves=0,goalsAgainst=0,shutout=0,qualityStart=0}={}){
    this.#games+=Math.max(0,Number(games)||0);
    this.#goals+=Math.max(0,Number(goals)||0);
    this.#assists+=Math.max(0,Number(assists)||0);
    this.#shots+=Math.max(0,Number(shots)||0);
    this.#totalIceTime+=Math.max(0,Number(totalIceTime)||0);
    this.#penaltyMinutes+=Math.max(0,Number(penaltyMinutes)||0);
    this.#plusMinus+=Number(plusMinus)||0;
    this.#shotsAgainst+=Math.max(0,Number(shotsAgainst)||0);
    this.#saves+=Math.max(0,Number(saves)||0);
    this.#goalsAgainst+=Math.max(0,Number(goalsAgainst)||0);
    this.#shutouts+=Math.max(0,Number(shutout)||0);
    this.#qualityStarts+=Math.max(0,Number(qualityStart)||0);
    this.#points=this.#goals+this.#assists;
  }
  resetForSeason(seasonId=this.#seasonId){
    this.#seasonId=seasonId;
    this.importSnapshot();
  }
  importSnapshot({seasonId,games=0,goals=0,assists=0,shots=0,totalIceTime=0,penaltyMinutes=0,plusMinus=0,shotsAgainst=0,saves=0,goalsAgainst=0,shutouts=0,qualityStarts=0}={}){
    if(seasonId)this.#seasonId=seasonId;
    this.#games=Math.max(0,Number(games)||0);
    this.#goals=Math.max(0,Number(goals)||0);
    this.#assists=Math.max(0,Number(assists)||0);
    this.#shots=Math.max(0,Number(shots)||0);
    this.#totalIceTime=Math.max(0,Number(totalIceTime)||0);
    this.#penaltyMinutes=Math.max(0,Number(penaltyMinutes)||0);
    this.#plusMinus=Number(plusMinus)||0;
    this.#shotsAgainst=Math.max(0,Number(shotsAgainst)||0);
    this.#saves=Math.max(0,Number(saves)||0);
    this.#goalsAgainst=Math.max(0,Number(goalsAgainst)||0);
    this.#shutouts=Math.max(0,Number(shutouts)||0);
    this.#qualityStarts=Math.max(0,Number(qualityStarts)||0);
    this.#points=this.#goals+this.#assists;
  }
  exportSnapshot(){
    return {
      seasonId:this.#seasonId,
      games:this.#games,
      goals:this.#goals,
      assists:this.#assists,
      points:this.#points,
      shots:this.#shots,
      totalIceTime:this.#totalIceTime,
      penaltyMinutes:this.#penaltyMinutes,
      plusMinus:this.#plusMinus,
      shotsAgainst:this.#shotsAgainst,
      saves:this.#saves,
      goalsAgainst:this.#goalsAgainst,
      shutouts:this.#shutouts,
      qualityStarts:this.#qualityStarts,
      savePercentage:this.savePercentage
    };
  }
}
