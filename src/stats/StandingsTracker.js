export class StandingsTracker{
  #table=new Map();
  recordMatch(match){
    if(!match?.home?.id||!match?.away?.id)return;
    const homeId=match.home.id,awayId=match.away.id;
    const homeGoals=Number(match.homeGoals)||0,awayGoals=Number(match.awayGoals)||0;
    this.#ensure(homeId);this.#ensure(awayId);
    this.#applyGame(homeId,homeGoals,awayGoals);
    this.#applyGame(awayId,awayGoals,homeGoals);
    if(homeGoals>awayGoals)this.#applyWinLoss(homeId,awayId);
    else if(awayGoals>homeGoals)this.#applyWinLoss(awayId,homeId);
  }
  getSnapshot(){return [...this.#table.entries()].map(([teamId,s])=>({teamId,...s}))}
  importSnapshot(list){
    this.#table.clear();
    (list||[]).forEach(r=>{if(r?.teamId)this.#table.set(r.teamId,{gp:r.gp||0,w:r.w||0,l:r.l||0,pts:r.pts||0,gf:r.gf||0,ga:r.ga||0});});
  }
  getRank(teamId,teams){
    const ordered=this.getTable(teams);
    const idx=ordered.findIndex(r=>r.teamId===teamId);
    return idx===-1?null:(idx+1);
  }
  getTable(teams){
    const rows=(teams||[]).map(t=>({teamId:t.id,shortName:t.shortName,name:t.name,...this.#ensure(t.id)}));
    rows.sort((a,b)=>{
      const gdA=a.gf-a.ga,gdB=b.gf-b.ga;
      return (b.pts-a.pts)||(gdB-gdA)||(b.gf-a.gf)||String(a.name).localeCompare(String(b.name),"ru");
    });
    return rows;
  }
  getTeamStats(teamId){
    const row=this.#table.get(teamId);
    return row?{...row}:null;
  }
  #ensure(teamId){
    if(!this.#table.has(teamId))this.#table.set(teamId,{gp:0,w:0,l:0,pts:0,gf:0,ga:0});
    return this.#table.get(teamId);
  }
  #applyGame(teamId,gf,ga){
    const s=this.#table.get(teamId);
    s.gp++;s.gf+=gf;s.ga+=ga;
  }
  #applyWinLoss(winnerId,loserId){
    const w=this.#table.get(winnerId),l=this.#table.get(loserId);
    w.w++;w.pts+=2;l.l++;
  }
}
