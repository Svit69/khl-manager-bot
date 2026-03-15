import { MatchSimulator } from "../sim/MatchSimulator.js";
import { StatsTracker } from "../stats/StatsTracker.js";
import { ContractService } from "../contracts/ContractService.js";
import { StandingsTracker } from "../stats/StandingsTracker.js";
import { buildCompetitiveLines } from "../data/lineupBuilder.js";
import { TradeService } from "../trade/TradeService.js";

export class AppState{
  #teams;#calendar;#freeAgents;#stats=new StatsTracker();#standings=new StandingsTracker();#sim=new MatchSimulator();#contracts;#trade;
  #lastMatch=null;#activeTeamId=null;
  constructor(teams,calendar,contracts,freeAgents=[]){
    this.#teams=teams;this.#calendar=calendar;this.#freeAgents=freeAgents;
    this.#contracts=new ContractService(contracts);
    this.#trade=new TradeService(playerId=>this.#contracts.getContractsForPlayer(playerId));
  }
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
  getCalendarScheduleRows(){return this.#calendar.getScheduleRows(this.#activeTeamId)}
  getAllPlayers(){return [...this.#teams.flatMap(team=>team.getRoster()),...this.#freeAgents]}
  getActiveTeamContractRows(){return this.activeTeam?this.#contracts.getTeamContractRows(this.activeTeam):[]}
  getActiveTeamFreeAgentRows(){return this.#contracts.getFreeAgentRows(this.getAvailableFreeAgents())}
  getTradePartnerTeams(){return this.activeTeam?this.#teams.filter(team=>team.id!==this.#activeTeamId):[]}
  getAvailableFreeAgents(){return this.#freeAgents.filter(player=>!player.affiliation?.teamId)}
  evaluateTradeWithTeam(teamId,givePlayerIds,receivePlayerIds){
    const opponent=this.#teams.find(team=>team.id===teamId);
    return this.activeTeam&&opponent?this.#trade.evaluateTrade(this.activeTeam,opponent,givePlayerIds,receivePlayerIds):null;
  }
  submitTradeWithTeam(teamId,givePlayerIds,receivePlayerIds){
    const opponent=this.#teams.find(team=>team.id===teamId);
    return this.activeTeam&&opponent?this.#trade.executeTrade(this.activeTeam,opponent,givePlayerIds,receivePlayerIds):null;
  }
  getActiveTeamNegotiationPreview(playerId,offer){
    const player=this.activeTeam?.getRoster().find(p=>p.id===playerId);
    return player?this.#contracts.getRenewalPreview(this.activeTeam,player,offer,this.#buildNegotiationContext(this.activeTeam)):null;
  }
  submitActiveTeamNegotiation(playerId,offer){
    const player=this.activeTeam?.getRoster().find(p=>p.id===playerId);
    return player?this.#contracts.submitRenewalOffer(this.activeTeam,player,offer,this.#buildNegotiationContext(this.activeTeam)):null;
  }
  getFreeAgentSigningPreview(playerId,offer){
    const player=this.getAvailableFreeAgents().find(entry=>entry.id===playerId);
    return this.activeTeam&&player?this.#contracts.getFreeAgentPreview(this.activeTeam,player,offer,this.#buildNegotiationContext(this.activeTeam)):null;
  }
  submitFreeAgentSigning(playerId,offer){
    const player=this.getAvailableFreeAgents().find(entry=>entry.id===playerId);
    if(!this.activeTeam||!player)return null;
    const result=this.#contracts.submitFreeAgentOffer(this.activeTeam,player,offer,this.#buildNegotiationContext(this.activeTeam));
    if(result?.decision==="accept"){
      player.affiliation.acquiredDay=this.#calendar.currentDay;
      this.activeTeam.reservePlayers.push(player);
    }
    return result;
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
    this.#calendar.recordResult(day.day,this.#lastMatch);
    this.#standings.recordMatch(this.#lastMatch);
    this.#stats.recordMatch(this.#lastMatch);
    this.#applyMatchPlayerStats(this.#lastMatch);
    this.#applyFatigue([day.match.home,day.match.away],12);
    this.#calendar.advanceDay();
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
      this.#calendar.recordResult(day.day,simulated);
      this.#standings.recordMatch(simulated);
      this.#stats.recordMatch(simulated);
      this.#applyMatchPlayerStats(simulated);
      this.#applyFatigue([day.match.home,day.match.away],12);
      this.#calendar.advanceDay();
      if(isActiveMatch){
        this.#lastMatch=simulated;
        return simulated;
      }
    }
  }
  exportState(){
    const players=this.getAllPlayers().map(player=>({
      id:player.id,
      fatigueScore:player.fatigueScore,
      form:player.form,
      injuryUntilDay:player.condition.injuryUntilDay,
      seasonStats:player.seasonStats.exportSnapshot(),
      teamId:player.affiliation?.teamId||null,
      contractId:player.affiliation?.contractId||null,
      acquiredDay:player.affiliation?.acquiredDay??null
    }));
    const rosters=this.#teams.map(team=>({teamId:team.id,playerIds:team.getRoster().map(player=>player.id)}));
    return {
      calendarIndex:this.#calendar.index,
      calendarResults:this.#calendar.exportResults(),
      players,
      stats:this.#stats.getSeasonStats(),
      activeTeamId:this.#activeTeamId,
      contracts:this.#contracts.exportContracts(),
      standings:this.#standings.getSnapshot(),
      rosters
    };
  }
  importState(saved){
    if(!saved)return;
    const allPlayers=[...new Map(this.getAllPlayers().map(player=>[player.id,player])).values()];
    this.#calendar.index=saved.calendarIndex||0;
    this.#activeTeamId=saved.activeTeamId||null;
    if(saved.calendarResults)this.#calendar.importResults(saved.calendarResults);
    if(saved.rosters)this.#importRosters(saved.rosters);
    const map=new Map((saved.players||[]).map(player=>[player.id,player]));
    allPlayers.forEach(player=>{
      const snapshot=map.get(player.id);
      if(!snapshot)return;
      player.applyFatigue(snapshot.fatigueScore-player.fatigueScore);
      player.applyFormDelta(snapshot.form-player.form);
      if(snapshot.seasonStats)player.seasonStats.importSnapshot(snapshot.seasonStats);
      if("teamId" in snapshot)player.affiliation.teamId=snapshot.teamId;
      if("contractId" in snapshot)player.affiliation.contractId=snapshot.contractId;
      if("acquiredDay" in snapshot)player.affiliation.acquiredDay=snapshot.acquiredDay;
    });
    this.#freeAgents=allPlayers.filter(player=>!player.affiliation?.teamId);
    if(saved.contracts)this.#contracts.importContracts(saved.contracts);
    if(saved.standings)this.#standings.importSnapshot(saved.standings);
    this.#stats.importStats(saved.stats);
  }
  applyFantasyDraft(assignmentsByTeamId){
    const allPlayers=[...new Map(this.getAllPlayers().map(player=>[player.id,player])).values()];
    const draftedPlayersById=new Map();
    Object.values(assignmentsByTeamId||{}).flat().forEach(player=>{
      if(player?.id)draftedPlayersById.set(player.id,player);
    });
    const undraftedPlayers=allPlayers.filter(player=>!draftedPlayersById.has(player.id));

    this.#teams.forEach(team=>{
      const picked=[...(assignmentsByTeamId?.[team.id]||[])];
      picked.forEach(player=>{
        player.affiliation.teamId=team.id;
        player.affiliation.acquiredDay=null;
      });
      const lineup=buildCompetitiveLines(picked);
      team.lines.splice(0,team.lines.length,...lineup.lines);
      team.reservePlayers.splice(0,team.reservePlayers.length,...lineup.reservePlayers);
    });
    undraftedPlayers.forEach(player=>{
      player.affiliation.teamId=null;
      player.affiliation.contractId=null;
      player.affiliation.acquiredDay=null;
    });
    this.#contracts.releasePlayers(undraftedPlayers.map(player=>player.id));
    this.#freeAgents=undraftedPlayers;
    this.#calendar.index=0;
    this.#lastMatch=null;
    this.#stats.importStats([]);
    this.#standings.importSnapshot([]);
    this.getAllPlayers().forEach(player=>player.seasonStats.importSnapshot());
  }
  #importRosters(rosters){
    const playersById=new Map(this.getAllPlayers().map(player=>[player.id,player]));
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
  #applyFatigue(teams,delta){teams.flatMap(team=>team.getRoster()).forEach(player=>{player.applyFatigue(delta);player.applyFormDelta(Math.random()*0.02-0.01)})}
  #applyMatchPlayerStats(match){
    const applySide=(teamSummary,team)=>{
      const byId=new Map(team.getRoster().map(player=>[player.id,player]));
      (teamSummary?.playerStats||[]).forEach(stat=>{
        const player=byId.get(stat.playerId);
        if(player)player.seasonStats.applyMatch(stat);
      });
    };
    applySide(match?.summary?.home,match?.home);
    applySide(match?.summary?.away,match?.away);
  }
  #buildNegotiationContext(team){
    const rank=this.#standings.getRank(team.id,this.#teams);
    const teamsCount=this.#teams.length;
    const teamStats=this.#standings.getTeamStats(team.id);
    const teamGamesPlayed=teamStats?.gp||0;
    return {
      teamRank:rank,
      teamsCount,
      teamGamesPlayed,
      isInTop8:rank!==null && rank<=8,
      teamRoster:team.getRoster(),
      allPlayers:this.getAllPlayers()
    };
  }
}
