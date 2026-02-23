export class StatsTracker{
  #season=new Map();
  recordMatch(match){
    (match?.events||[]).forEach(e=>{
      if(e?.type && e.type!=="goal")return;
      const teamName=e?.team||"";
      this.#addPoint(e?.scorer?.name||e?.scorer,"goals",teamName);
      const assists=Array.isArray(e?.assists)?e.assists:[e?.assist].filter(Boolean);
      assists.forEach(name=>this.#addPoint(name,"assists",teamName));
    });
  }
  getSeasonStats(){
    return [...this.#season.entries()].map(([name,stats])=>({name,...stats,points:(stats.goals||0)+(stats.assists||0)}))
      .sort((a,b)=>b.goals+b.assists-(a.goals+a.assists));
  }
  importStats(list){
    this.#season.clear();
    (list||[]).forEach(s=>this.#season.set(s.name,{goals:s.goals,assists:s.assists,team:s.team||""}));
  }
  #addPoint(name,key,team=""){
    if(!name)return;
    if(!this.#season.has(name))this.#season.set(name,{goals:0,assists:0,team:""});
    if(team && !this.#season.get(name).team)this.#season.get(name).team=team;
    this.#season.get(name)[key]++;
  }
}
