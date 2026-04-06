import { MatchSimulator } from "../sim/MatchSimulator.js";
import { StatsTracker } from "../stats/StatsTracker.js";
import { ContractService } from "../contracts/ContractService.js";
import { StandingsTracker } from "../stats/StandingsTracker.js";
import { buildCompetitiveLines } from "../data/lineupBuilder.js";
import { calculateAge } from "../contracts/SeasonUtils.js";
import { PlayerDevelopmentService } from "../progression/PlayerDevelopmentService.js";
import { TradeService } from "../trade/TradeService.js";

export class AppState{
  #teams;#calendar;#freeAgents;#stats=new StatsTracker();#standings=new StandingsTracker();#sim=new MatchSimulator();#contracts;#development=new PlayerDevelopmentService();#trade;
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
  getActiveTeamStatisticsRows(sortBy="points"){return this.activeTeam?this.#contracts.getTeamStatisticsRows(this.activeTeam,this.#buildNegotiationContext(this.activeTeam),sortBy):[]}
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
  moveActiveTeamLinePlayerToReserve(lineIndex,slotIndex){
    return this.activeTeam?this.activeTeam.moveLinePlayerToReserve(lineIndex,slotIndex):false;
  }
  swapActiveTeamRosterSlots(source,target){
    return this.activeTeam?this.activeTeam.swapRosterSlots(source,target):false;
  }
  playDay(){
    const day=this.#calendar.getCurrent();
    return day?this.#simulateCalendarDay(day,null):null;
  }
  playDayForActiveTeam(){
    if(!this.#activeTeamId)return this.playDay();
    while(true){
      const day=this.#calendar.getCurrent();
      if(!day)return null;
      if(!day.matches?.length)return this.#simulateCalendarDay(day,null);
      const simulated=this.#simulateCalendarDay(day,this.#activeTeamId);
      if(simulated)return simulated;
    }
  }
  exportState(){
    const players=this.getAllPlayers().map(player=>({
      id:player.id,
      fatigueScore:player.fatigueScore,
      form:player.form,
      injuryUntilDay:player.condition.injuryUntilDay,
      moodScore:player.moodScore,
      attributes:player.attributes.exportSnapshot(),
      potential:player.potential.exportSnapshot(),
      seasonStats:player.seasonStats.exportSnapshot(),
      teamId:player.affiliation?.teamId||null,
      contractId:player.affiliation?.contractId||null,
      acquiredDay:player.affiliation?.acquiredDay??null
    }));
    const rosters=this.#teams.map(team=>({
      teamId:team.id,
      linePlayerIds:team.lines.map(line=>line.players.map(player=>player?.id||null)),
      reservePlayerIds:team.reservePlayers.map(player=>player.id)
    }));
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
      if("moodScore" in snapshot)player.applyMoodDelta(snapshot.moodScore-player.moodScore);
      if(snapshot.attributes)player.attributes.importSnapshot(snapshot.attributes);
      if(snapshot.potential)player.potential.importSnapshot(snapshot.potential);
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
      const restored=this.#restoreSavedRoster(team,item,playersById);
      if(!restored){
        const picked=(item.playerIds||[]).map(playerId=>playersById.get(playerId)).filter(Boolean);
        picked.forEach(player=>{player.affiliation.teamId=team.id});
        const lineup=buildCompetitiveLines(picked);
        team.lines.splice(0,team.lines.length,...lineup.lines);
        team.reservePlayers.splice(0,team.reservePlayers.length,...lineup.reservePlayers);
      }
    });
  }
  #restoreSavedRoster(team,item,playersById){
    const linePlayerIds=item?.linePlayerIds;
    const reservePlayerIds=item?.reservePlayerIds;
    if(!Array.isArray(linePlayerIds)||!Array.isArray(reservePlayerIds))return false;
    linePlayerIds.forEach((lineIds,lineIndex)=>{
      const line=team.lines[lineIndex];
      if(!line||!Array.isArray(lineIds)||lineIds.length!==line.positions.length)return;
      line.players.splice(0,line.players.length,...lineIds.map(playerId=>{
        const player=playerId?playersById.get(playerId):null;
        if(player)player.affiliation.teamId=team.id;
        return player||null;
      }));
    });
    team.reservePlayers.splice(0,team.reservePlayers.length,...reservePlayerIds.map(playerId=>{
      const player=playersById.get(playerId);
      if(player)player.affiliation.teamId=team.id;
      return player;
    }).filter(Boolean));
    return true;
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
  #simulateCalendarDay(day,focusTeamId){
    const matches=day?.matches||[];
    if(matches.length===0){
      this.#lastMatch=null;
      this.#applyFatigue(this.#teams,-8);
      this.#calendar.advanceDay();
      return null;
    }

    const focusedMatches=[];
    const playedTeams=new Set();
    matches.forEach(match=>{
      const simulated=this.#sim.simulateMatch(match.home,match.away);
      this.#calendar.recordResult(day.day,match.id,simulated);
      this.#standings.recordMatch(simulated);
      this.#stats.recordMatch(simulated);
      this.#applyMatchPlayerStats(simulated);
      this.#development.applyMatchDevelopment(simulated.home,simulated.summary?.home,{teamGamesPlayed:(this.#standings.getTeamStats(simulated.home.id)?.gp||0)});
      this.#development.applyMatchDevelopment(simulated.away,simulated.summary?.away,{teamGamesPlayed:(this.#standings.getTeamStats(simulated.away.id)?.gp||0)});
      this.#applyMatchMood(simulated.home,simulated.summary?.home);
      this.#applyMatchMood(simulated.away,simulated.summary?.away);
      playedTeams.add(match.home.id);
      playedTeams.add(match.away.id);
      if(!focusTeamId || match.home.id===focusTeamId || match.away.id===focusTeamId){
        focusedMatches.push(simulated);
      }
    });

    const playedTeamList=this.#teams.filter(team=>playedTeams.has(team.id));
    const idleTeamList=this.#teams.filter(team=>!playedTeams.has(team.id));
    if(playedTeamList.length)this.#applyFatigue(playedTeamList,12);
    if(idleTeamList.length)this.#applyFatigue(idleTeamList,-8);
    this.#calendar.advanceDay();
    this.#lastMatch=focusedMatches[0]||null;
    return this.#lastMatch;
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
  #applyMatchMood(team,teamSummary){
    const roster=team?.getRoster?.()||[];
    if(!roster.length)return;
    const statsById=new Map((teamSummary?.playerStats||[]).map(stat=>[stat.playerId,stat]));
    const playedPlayers=roster.filter(player=>statsById.has(player.id));
    const playedByGroup=new Map();
    playedPlayers.forEach(player=>{
      const group=this.#getPositionMoodGroup(player.identity?.primaryPosition);
      if(!playedByGroup.has(group))playedByGroup.set(group,[]);
      playedByGroup.get(group).push(player);
    });

    roster.forEach(player=>{
      const stat=statsById.get(player.id);
      if(stat){
        const iceMinutes=(Number(stat.totalIceTime)||0)/60;
        let moodDelta=1.1;
        if(iceMinutes>=18)moodDelta+=0.9;
        else if(iceMinutes>=12)moodDelta+=0.5;
        else if(iceMinutes<8)moodDelta-=0.2;
        if(player.moodState==="red"||player.moodState==="orange")moodDelta+=0.35;
        player.applyMoodDelta(moodDelta);
        return;
      }

      const groupPlayers=playedByGroup.get(this.#getPositionMoodGroup(player.identity?.primaryPosition))||[];
      const age=calculateAge(player.identity?.birthDate);
      const sensitivity=age<=19?0.25:(age<=22?0.55:1);
      if(!groupPlayers.length){
        player.applyMoodDelta(-0.35*sensitivity);
        return;
      }

      const strongerThanSomeone=groupPlayers.some(activePlayer=>(player.ovr||0)>(activePlayer.ovr||0));
      const averageActiveOvr=groupPlayers.reduce((total,activePlayer)=>total+(activePlayer.ovr||0),0)/groupPlayers.length;
      let moodDelta=-0.75;
      if(strongerThanSomeone && (player.ovr||0)>=averageActiveOvr+1){
        moodDelta=-3.2;
      }else if((player.ovr||0)>=averageActiveOvr-1){
        moodDelta=-1.6;
      }else if((player.ovr||0)<=averageActiveOvr-4){
        moodDelta=-0.35;
      }
      player.applyMoodDelta(moodDelta*sensitivity);
    });
  }
  #getPositionMoodGroup(position){
    if(position==="\u0417\u0410\u0429")return "DEF";
    if(position==="\u0412\u0420\u0422")return "G";
    return "FWD";
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
