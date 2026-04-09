export class PlayerSeasonStats{
  #seasonId;#playerId;#games;#goals;#assists;#points;#shots;#totalIceTime;#penaltyMinutes;
  constructor({seasonId,playerId,games=0,goals=0,assists=0,points=0,shots=0,totalIceTime=0,penaltyMinutes=0}){
    this.#seasonId=seasonId;this.#playerId=playerId;this.#games=games;this.#goals=goals;this.#assists=assists;this.#points=points;this.#shots=shots;this.#totalIceTime=totalIceTime;this.#penaltyMinutes=penaltyMinutes;
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
  addGame(){this.#games++}
  addGoal(){this.#goals++;this.#points++}
  addAssist(){this.#assists++;this.#points++}
  addShot(count=1){this.#shots+=Math.max(0,Number(count)||0)}
  addIceTime(seconds=0){this.#totalIceTime+=Math.max(0,Number(seconds)||0)}
  addPenaltyMinutes(minutes=0){this.#penaltyMinutes+=Math.max(0,Number(minutes)||0)}
  applyMatch({games=1,goals=0,assists=0,shots=0,totalIceTime=0,penaltyMinutes=0}={}){
    this.#games+=Math.max(0,Number(games)||0);
    this.#goals+=Math.max(0,Number(goals)||0);
    this.#assists+=Math.max(0,Number(assists)||0);
    this.#shots+=Math.max(0,Number(shots)||0);
    this.#totalIceTime+=Math.max(0,Number(totalIceTime)||0);
    this.#penaltyMinutes+=Math.max(0,Number(penaltyMinutes)||0);
    this.#points=this.#goals+this.#assists;
  }
  resetForSeason(seasonId=this.#seasonId){
    this.#seasonId=seasonId;
    this.importSnapshot();
  }
  importSnapshot({seasonId,games=0,goals=0,assists=0,shots=0,totalIceTime=0,penaltyMinutes=0}={}){
    if(seasonId)this.#seasonId=seasonId;
    this.#games=Math.max(0,Number(games)||0);
    this.#goals=Math.max(0,Number(goals)||0);
    this.#assists=Math.max(0,Number(assists)||0);
    this.#shots=Math.max(0,Number(shots)||0);
    this.#totalIceTime=Math.max(0,Number(totalIceTime)||0);
    this.#penaltyMinutes=Math.max(0,Number(penaltyMinutes)||0);
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
      penaltyMinutes:this.#penaltyMinutes
    };
  }
}
