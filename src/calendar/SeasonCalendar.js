export class SeasonCalendar{
  #days;#index=0;
  constructor(teams){this.#days=this.#buildSchedule(teams)}
  get index(){return this.#index}
  set index(value){this.#index=Math.max(0,Math.min(this.#days.length,value))}
  get currentDay(){return this.#index+1}
  getCurrent(){return this.#days[this.#index]||null}
  getScheduleRows(activeTeamId=null){
    return this.#days.map((day,index)=>{
      const match=day.match;
      const isPlayed=Boolean(day.result)||(!match && index<this.#index);
      const isCurrent=index===this.#index;
      const isMyMatch=Boolean(match&&activeTeamId&&(match.home?.id===activeTeamId||match.away?.id===activeTeamId));
      return {
        day:day.day,isPlayed,isCurrent,isMyMatch,isRestDay:!match,
        home:match?.home?{id:match.home.id,name:match.home.name,shortName:match.home.shortName}:null,
        away:match?.away?{id:match.away.id,name:match.away.name,shortName:match.away.shortName}:null,
        result:day.result?{...day.result}:null
      };
    });
  }
  getCurrentForTeam(teamId){
    if(!teamId)return this.getCurrent();
    for(let i=this.#index;i<this.#days.length;i++){
      const day=this.#days[i];
      if(!day?.match)return day;
      if(day.match.home?.id===teamId||day.match.away?.id===teamId)return day;
    }
    return null;
  }
  advanceDay(){if(this.#index<this.#days.length)this.#index++}
  recordResult(dayNumber,matchResult){
    const day=this.#days.find(item=>item.day===dayNumber);
    if(!day||!day.match||!matchResult)return;
    day.result={homeGoals:Number(matchResult.homeGoals)||0,awayGoals:Number(matchResult.awayGoals)||0,wentToOvertime:Boolean(matchResult?.summary?.wentToOvertime)};
  }
  exportResults(){return this.#days.filter(day=>day.result).map(day=>({day:day.day,...day.result}))}
  importResults(results){
    const map=new Map((results||[]).map(item=>[item.day,item]));
    this.#days.forEach(day=>{
      const r=map.get(day.day);
      day.result=r?{homeGoals:r.homeGoals||0,awayGoals:r.awayGoals||0,wentToOvertime:Boolean(r.wentToOvertime)}:null;
    });
  }
  isFinished(){return this.#index>=this.#days.length}
  #buildSchedule(teams){
    const days=[];let day=1;let count=0;
    for(let i=0;i<teams.length;i++){
      for(let j=i+1;j<teams.length;j++){
        days.push({day:day++,match:{home:teams[i],away:teams[j]},result:null});count++;
        if(count%2===0)days.push({day:day++,match:null,result:null});
        days.push({day:day++,match:{home:teams[j],away:teams[i]},result:null});count++;
        if(count%2===0)days.push({day:day++,match:null,result:null});
      }
    }
    return days;
  }
}
