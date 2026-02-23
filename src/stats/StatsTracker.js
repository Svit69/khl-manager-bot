export class StatsTracker{
  #season=new Map();
  recordMatch(match){
    (match?.events||[]).forEach(e=>{
      if(e?.type && e.type!=="goal")return;
      this.#addPoint(e?.scorer?.name||e?.scorer,"goals");
      const assists=Array.isArray(e?.assists)?e.assists:[e?.assist].filter(Boolean);
      assists.forEach(name=>this.#addPoint(name,"assists"));
    });
  }
  getSeasonStats(){
    return [...this.#season.entries()].map(([name,stats])=>({name,...stats}))
      .sort((a,b)=>b.goals+b.assists-(a.goals+a.assists));
  }
  importStats(list){
    this.#season.clear();
    (list||[]).forEach(s=>this.#season.set(s.name,{goals:s.goals,assists:s.assists}));
  }
  #addPoint(name,key){
    if(!name)return;
    if(!this.#season.has(name))this.#season.set(name,{goals:0,assists:0});
    this.#season.get(name)[key]++;
  }
}
