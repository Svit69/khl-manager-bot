export class SeasonCalendar{
  #days;#index=0;
  constructor(teams){this.#days=this.#buildSchedule(teams)}
  get index(){return this.#index}
  set index(value){this.#index=Math.max(0,Math.min(this.#days.length,value))}
  get currentDay(){return this.#index+1}
  getCurrent(){return this.#days[this.#index]||null}
  advanceDay(){if(this.#index<this.#days.length)this.#index++}
  isFinished(){return this.#index>=this.#days.length}
  #buildSchedule(teams){
    const days=[];let day=1;let count=0;
    for(let i=0;i<teams.length;i++){
      for(let j=i+1;j<teams.length;j++){
        days.push({day:day++,match:{home:teams[i],away:teams[j]}});count++;
        if(count%2===0)days.push({day:day++,match:null});
        days.push({day:day++,match:{home:teams[j],away:teams[i]}});count++;
        if(count%2===0)days.push({day:day++,match:null});
      }
    }
    return days;
  }
}
