export class StatsTracker{
  #season=new Map();
  recordMatch(match){match.events.forEach(e=>{this.#addPoint(e.scorer,"goals");this.#addPoint(e.assist,"assists")})}
  getSeasonStats(){
    return [...this.#season.entries()].map(([name,stats])=>({name,...stats}))
      .sort((a,b)=>b.goals+b.assists-(a.goals+a.assists));
  }
  importStats(list){
    this.#season.clear();
    (list||[]).forEach(s=>this.#season.set(s.name,{goals:s.goals,assists:s.assists}));
  }
  #addPoint(name,key){
    if(!this.#season.has(name))this.#season.set(name,{goals:0,assists:0});
    this.#season.get(name)[key]++;
  }
}
