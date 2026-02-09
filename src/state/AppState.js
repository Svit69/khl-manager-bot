import { MatchSimulator } from "../sim/MatchSimulator.js";
import { StatsTracker } from "../stats/StatsTracker.js";
import { ContractService } from "../contracts/ContractService.js";
import { StandingsTracker } from "../stats/StandingsTracker.js";
export class AppState{
  #teams;#calendar;#stats=new StatsTracker();#standings=new StandingsTracker();#sim=new MatchSimulator();#contracts;
  #lastMatch=null;#activeTeamId=null;
  constructor(teams,calendar,contracts){this.#teams=teams;this.#calendar=calendar;this.#contracts=new ContractService(contracts)}
  get teams(){return this.#teams}
  get calendar(){return this.#calendar}
  get lastMatch(){return this.#lastMatch}
  get seasonStats(){return this.#stats.getSeasonStats()}
  get activeTeamId(){return this.#activeTeamId}
  get activeTeam(){return this.#teams.find(t=>t.id===this.#activeTeamId)||null}
  setActiveTeamId(teamId){this.#activeTeamId=teamId}
  getActiveTeamContractRows(){return this.activeTeam?this.#contracts.getTeamContractRows(this.activeTeam):[]}
  getActiveTeamNegotiationPreview(playerId,offer){
    const player=this.activeTeam?.getRoster().find(p=>p.id===playerId);
    return player?this.#contracts.getRenewalPreview(this.activeTeam,player,offer,this.#buildNegotiationContext(this.activeTeam)):null;
  }
  submitActiveTeamNegotiation(playerId,offer){
    const player=this.activeTeam?.getRoster().find(p=>p.id===playerId);
    return player?this.#contracts.submitRenewalOffer(this.activeTeam,player,offer,this.#buildNegotiationContext(this.activeTeam)):null;
  }
  extendActiveTeamPlayerContract(playerId,mode){
    const player=this.activeTeam?.getRoster().find(p=>p.id===playerId);
    return player?this.#contracts.extendContract(player,mode):null;
  }
  playDay(){
    const day=this.#calendar.getCurrent();
    if(!day)return null;
    if(!day.match){this.#lastMatch=null;this.#applyFatigue(this.#teams,-8);this.#calendar.advanceDay();return null;}
    this.#lastMatch=this.#sim.simulateMatch(day.match.home,day.match.away);
    this.#standings.recordMatch(this.#lastMatch);
    this.#stats.recordMatch(this.#lastMatch);this.#applyFatigue([day.match.home,day.match.away],12);this.#calendar.advanceDay();
    return this.#lastMatch;
  }
  exportState(){
    const players=this.#teams.flatMap(t=>t.getRoster()).map(p=>({id:p.id,fatigueScore:p.fatigueScore,form:p.form,injuryUntilDay:p.condition.injuryUntilDay}));
    return {calendarIndex:this.#calendar.index,players,stats:this.#stats.getSeasonStats(),activeTeamId:this.#activeTeamId,contracts:this.#contracts.exportContracts(),standings:this.#standings.getSnapshot()};
  }
  importState(saved){
    if(!saved)return;
    this.#calendar.index=saved.calendarIndex||0;this.#activeTeamId=saved.activeTeamId||null;
    const map=new Map((saved.players||[]).map(p=>[p.id,p]));
    this.#teams.flatMap(t=>t.getRoster()).forEach(p=>{const s=map.get(p.id);if(s){p.applyFatigue(s.fatigueScore-p.fatigueScore);p.applyFormDelta(s.form-p.form)}});
    if(saved.contracts)this.#contracts.importContracts(saved.contracts);
    if(saved.standings)this.#standings.importSnapshot(saved.standings);
    this.#stats.importStats(saved.stats);
  }
  #applyFatigue(teams,delta){teams.flatMap(t=>t.getRoster()).forEach(p=>{p.applyFatigue(delta);p.applyFormDelta(Math.random()*0.02-0.01)})}
  #buildNegotiationContext(team){
    const rank=this.#standings.getRank(team.id,this.#teams);
    const teamsCount=this.#teams.length;
    return {teamRank:rank,teamsCount,isInTop8:rank!==null && rank<=8};
  }
}
