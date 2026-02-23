import { MatchSimulator } from "../sim/MatchSimulator.js";
import { StatsTracker } from "../stats/StatsTracker.js";
import { ContractService } from "../contracts/ContractService.js";
import { StandingsTracker } from "../stats/StandingsTracker.js";
import { buildCompetitiveLines } from "../data/lineupBuilder.js";
export class AppState{
  #teams;#calendar;#stats=new StatsTracker();#standings=new StandingsTracker();#sim=new MatchSimulator();#contracts;
  #lastMatch=null;#activeTeamId=null;
  constructor(teams,calendar,contracts){this.#teams=teams;this.#calendar=calendar;this.#contracts=new ContractService(contracts)}
  get teams(){return this.#teams}
  get calendar(){return this.#calendar}
  get lastMatch(){return this.#lastMatch}
  get seasonStats(){return this.#stats.getSeasonStats()}
  getStandingsTable(){return this.#standings.getTable(this.#teams)}
  getTopScorers(limit=10){return this.#stats.getSeasonStats().slice(0,limit)}
  get activeTeamId(){return this.#activeTeamId}
  get activeTeam(){return this.#teams.find(t=>t.id===this.#activeTeamId)||null}
  setActiveTeamId(teamId){this.#activeTeamId=teamId}
  getVisibleCalendarDay(){
    return this.#activeTeamId?this.#calendar.getCurrentForTeam(this.#activeTeamId):this.#calendar.getCurrent();
  }
  getAllPlayers(){return this.#teams.flatMap(team=>team.getRoster())}
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
  swapActiveTeamRosterSlots(source,target){
    return this.activeTeam?this.activeTeam.swapRosterSlots(source,target):false;
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
  playDayForActiveTeam(){
    if(!this.#activeTeamId)return this.playDay();
    while(true){
      const day=this.#calendar.getCurrent();
      if(!day)return null;
      if(!day.match){
        this.#lastMatch=null;
        this.#applyFatigue(this.#teams,-8);
        this.#calendar.advanceDay();
        return null;
      }
      const isActiveMatch=day.match.home?.id===this.#activeTeamId || day.match.away?.id===this.#activeTeamId;
      const simulated=this.#sim.simulateMatch(day.match.home,day.match.away);
      this.#standings.recordMatch(simulated);
      this.#stats.recordMatch(simulated);
      this.#applyFatigue([day.match.home,day.match.away],12);
      this.#calendar.advanceDay();
      if(isActiveMatch){
        this.#lastMatch=simulated;
        return simulated;
      }
      // Чужой матч симулируем фоном и идем дальше до события пользователя.
    }
  }
  exportState(){
    const players=this.#teams.flatMap(t=>t.getRoster()).map(p=>({id:p.id,fatigueScore:p.fatigueScore,form:p.form,injuryUntilDay:p.condition.injuryUntilDay}));
    const rosters=this.#teams.map(team=>({teamId:team.id,playerIds:team.getRoster().map(player=>player.id)}));
    return {calendarIndex:this.#calendar.index,players,stats:this.#stats.getSeasonStats(),activeTeamId:this.#activeTeamId,contracts:this.#contracts.exportContracts(),standings:this.#standings.getSnapshot(),rosters};
  }
  importState(saved){
    if(!saved)return;
    this.#calendar.index=saved.calendarIndex||0;this.#activeTeamId=saved.activeTeamId||null;
    if(saved.rosters)this.#importRosters(saved.rosters);
    const map=new Map((saved.players||[]).map(p=>[p.id,p]));
    this.#teams.flatMap(t=>t.getRoster()).forEach(p=>{const s=map.get(p.id);if(s){p.applyFatigue(s.fatigueScore-p.fatigueScore);p.applyFormDelta(s.form-p.form)}});
    if(saved.contracts)this.#contracts.importContracts(saved.contracts);
    if(saved.standings)this.#standings.importSnapshot(saved.standings);
    this.#stats.importStats(saved.stats);
  }
  applyFantasyDraft(assignmentsByTeamId){
    this.#teams.forEach(team=>{
      const picked=[...(assignmentsByTeamId?.[team.id]||[])];
      picked.forEach(player=>{player.affiliation.teamId=team.id});
      const lineup=buildCompetitiveLines(picked);
      team.lines.splice(0,team.lines.length,...lineup.lines);
      team.reservePlayers.splice(0,team.reservePlayers.length,...lineup.reservePlayers);
    });
    this.#calendar.index=0;
    this.#lastMatch=null;
    this.#stats.importStats([]);
    this.#standings.importSnapshot([]);
  }
  #importRosters(rosters){
    const playersById=new Map(this.#teams.flatMap(team=>team.getRoster()).map(player=>[player.id,player]));
    (rosters||[]).forEach(item=>{
      const team=this.#teams.find(entry=>entry.id===item.teamId);
      if(!team)return;
      const picked=(item.playerIds||[]).map(playerId=>playersById.get(playerId)).filter(Boolean);
      picked.forEach(player=>{player.affiliation.teamId=team.id});
      if(!this.#applySavedRosterOrder(team,picked)){
        const lineup=buildCompetitiveLines(picked);
        team.lines.splice(0,team.lines.length,...lineup.lines);
        team.reservePlayers.splice(0,team.reservePlayers.length,...lineup.reservePlayers);
      }
    });
  }
  #applySavedRosterOrder(team,picked){
    if(!team||!Array.isArray(picked)||picked.length===0)return false;
    const lineSizes=team.lines.map(line=>line.players.length);
    const requiredSkaters=lineSizes.reduce((sum,size)=>sum+size,0);
    if(picked.length<requiredSkaters)return false;
    let cursor=0;
    team.lines.forEach((line,lineIndex)=>{
      const nextPlayers=picked.slice(cursor,cursor+lineSizes[lineIndex]);
      if(nextPlayers.length!==lineSizes[lineIndex])return;
      line.players.splice(0,line.players.length,...nextPlayers);
      cursor+=lineSizes[lineIndex];
    });
    team.reservePlayers.splice(0,team.reservePlayers.length,...picked.slice(cursor));
    return true;
  }
  #applyFatigue(teams,delta){teams.flatMap(t=>t.getRoster()).forEach(p=>{p.applyFatigue(delta);p.applyFormDelta(Math.random()*0.02-0.01)})}
  #buildNegotiationContext(team){
    const rank=this.#standings.getRank(team.id,this.#teams);
    const teamsCount=this.#teams.length;
    const teamStats=this.#standings.getTeamStats(team.id);
    const teamGamesPlayed=teamStats?.gp||0;
    return {teamRank:rank,teamsCount,teamGamesPlayed,isInTop8:rank!==null && rank<=8};
  }
}
