import { MatchSimulator } from "../sim/MatchSimulator.js";
import { StatsTracker } from "../stats/StatsTracker.js";
export class AppState{
  #teams;#calendar;#stats=new StatsTracker();#sim=new MatchSimulator();#lastMatch=null;#activeTeamId=null;
  constructor(teams,calendar){this.#teams=teams;this.#calendar=calendar}
  get teams(){return this.#teams}
  get calendar(){return this.#calendar}
  get lastMatch(){return this.#lastMatch}
  get seasonStats(){return this.#stats.getSeasonStats()}
  get activeTeamId(){return this.#activeTeamId}
  get activeTeam(){return this.#teams.find(t=>t.id===this.#activeTeamId)||null}
  setActiveTeamId(teamId){this.#activeTeamId=teamId}
  playDay(){
    const day=this.#calendar.getCurrent();
    if(!day)return null;
    if(!day.match){this.#lastMatch=null;this.#applyFatigue(this.#teams,-8);this.#calendar.advanceDay();return null;}
    this.#lastMatch=this.#sim.simulateMatch(day.match.home,day.match.away);
    this.#stats.recordMatch(this.#lastMatch);
    this.#applyFatigue([day.match.home,day.match.away],12);
    this.#calendar.advanceDay();
    return this.#lastMatch;
  }
  exportState(){
    const players=this.#teams.flatMap(t=>t.getRoster()).map(p=>({\n      id:p.identity.id,fatigueScore:p.fatigueScore,form:p.form,injuryUntilDay:p.condition.injuryUntilDay\n    }));
    return {calendarIndex:this.#calendar.index,players,stats:this.#stats.getSeasonStats(),activeTeamId:this.#activeTeamId};
  }
  importState(saved){
    if(!saved)return;
    this.#calendar.index=saved.calendarIndex||0;
    this.#activeTeamId=saved.activeTeamId||null;
    const map=new Map((saved.players||[]).map(p=>[p.id,p]));
    this.#teams.flatMap(t=>t.getRoster()).forEach(p=>{\n      const s=map.get(p.identity.id);\n      if(s){p.applyFatigue(s.fatigueScore-p.fatigueScore);p.applyFormDelta(s.form-p.form)}\n    });
    this.#stats.importStats(saved.stats);
  }
  #applyFatigue(teams,delta){
    teams.flatMap(t=>t.getRoster()).forEach(p=>{\n      p.applyFatigue(delta);\n      p.applyFormDelta(Math.random()*0.02-0.01);\n    });
  }
}
