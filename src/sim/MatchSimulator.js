import { calculateAge } from "../contracts/SeasonUtils.js";
import { HiddenPlayerTrait, hasHiddenTrait } from "../models/HiddenPlayerTraits.js";
import { adjustedOvrForPosition } from "../utils/positionFit.js";
import { poissonSample } from "./Poisson.js";

const REGULATION_SECONDS=60*60;
const REGULAR_OT_SECONDS=5*60;
const PLAYOFF_OT_SECONDS=20*60;
const PERIOD_SECONDS=20*60;
const PENALTY_MINUTES=2;
const SHOT_BIN_SECONDS=10;
const BASE_SKATERS=5;
const FORWARD_USAGE_WEIGHTS=[0.39,0.3,0.21,0.1];
const DEFENSE_USAGE_WEIGHTS=[0.42,0.34,0.17,0.07];
const LATE_GAME_PUSH_SECONDS=5*60;
const FORWARD_SHIFT_BINS=[5,5,4,4];
const DEFENSE_SHIFT_BINS=[6,5,5,4];
const PP_UNIT_SHARE=0.68;
const PK_UNIT_SHARE=0.62;

const rand=(min,max)=>min+Math.random()*(max-min);
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const sum=items=>items.reduce((a,b)=>a+b,0);
const getProfilePosition=profile=>profile.slotPosition||profile.player.identity?.primaryPosition;

export class MatchSimulator{
  simulateMatch(home,away,options={}){
    const isPlayoff=options?.phase==="playoffs";
    const coachEffects=options?.coachEffectsByTeamId||{};
    const homeContext=this.#buildTeamContext(home,{isPlayoff,coachEffect:coachEffects[home.id]});
    const awayContext=this.#buildTeamContext(away,{isPlayoff,coachEffect:coachEffects[away.id]});
    const homePlayerStats=this.#createPlayerStatsMap(homeContext);
    const awayPlayerStats=this.#createPlayerStatsMap(awayContext);

    const homePenalties=this.#buildPenaltyEvents(homeContext,false);
    const awayPenalties=this.#buildPenaltyEvents(awayContext,false);
    const baseHomeXg=this.#estimateExpectedGoals(homeContext,awayContext,true);
    const baseAwayXg=this.#estimateExpectedGoals(awayContext,homeContext,false);
    const homeXgReg=baseHomeXg+awayPenalties.length*0.16;
    const awayXgReg=baseAwayXg+homePenalties.length*0.16;

    const homeGoalResult=this.#buildGoalEvents(homeContext,awayContext,poissonSample(clamp(homeXgReg,0.55,6.1)),awayPenalties,homePenalties,false);
    const awayGoalResult=this.#buildGoalEvents(awayContext,homeContext,poissonSample(clamp(awayXgReg,0.55,6.1)),homePenalties,awayPenalties,false);
    let homeGoals=homeGoalResult.events;
    let awayGoals=awayGoalResult.events;
    const releasedHomePenaltyIds=awayGoalResult.releasedPenaltyIds;
    const releasedAwayPenaltyIds=homeGoalResult.releasedPenaltyIds;

    let wentToOvertime=false;
    let overtimeResult=null;
    if(homeGoals.length===awayGoals.length){
      wentToOvertime=true;
      overtimeResult=this.#simulateOvertime(homeContext,awayContext,{isPlayoff});
      if(overtimeResult?.event){
        if(overtimeResult.teamId===home.id)homeGoals=[...homeGoals,overtimeResult.event];
        else awayGoals=[...awayGoals,overtimeResult.event];
      }
    }

    const events=[...homePenalties,...awayPenalties,...homeGoals,...awayGoals]
      .sort((a,b)=>a.gameSecond-b.gameSecond||this.#eventPriority(a)-this.#eventPriority(b));

    const homeFinalGoals=homeGoals.length;
    const awayFinalGoals=awayGoals.length;
    const durationSeconds=overtimeResult?.durationSeconds||(
      wentToOvertime
        ? (REGULATION_SECONDS+(isPlayoff?PLAYOFF_OT_SECONDS:REGULAR_OT_SECONDS))
        : REGULATION_SECONDS
    );
    const homeShots=this.#estimateShots(homeFinalGoals,homeXgReg,durationSeconds);
    const awayShots=this.#estimateShots(awayFinalGoals,awayXgReg,durationSeconds);

    this.#applyIceTimeStats(homeContext,homePlayerStats,durationSeconds,homePenalties,awayPenalties,releasedHomePenaltyIds,releasedAwayPenaltyIds,overtimeResult?.format||null);
    this.#applyIceTimeStats(awayContext,awayPlayerStats,durationSeconds,awayPenalties,homePenalties,releasedAwayPenaltyIds,releasedHomePenaltyIds,overtimeResult?.format||null);
    this.#applyGoalEventStats([...homeGoals,...awayGoals],homePlayerStats);
    this.#applyGoalEventStats([...homeGoals,...awayGoals],awayPlayerStats);
    this.#applyPenaltyEventStats(homePenalties,homePlayerStats);
    this.#applyPenaltyEventStats(awayPenalties,awayPlayerStats);
    this.#applyShotStats(homeContext,homePlayerStats,homeShots,homeGoals);
    this.#applyShotStats(awayContext,awayPlayerStats,awayShots,awayGoals);

    return {
      home,
      away,
      homeGoals:homeFinalGoals,
      awayGoals:awayFinalGoals,
      events,
      summary:{
        durationSeconds,
        wentToOvertime,
        overtimeFormat:overtimeResult?.format||null,
        overtimePeriods:overtimeResult?.overtimePeriods||(wentToOvertime?1:0),
        phase:isPlayoff?"playoffs":"regular",
        home:{
          shots:homeShots,
          penalties:homePenalties.length,
          iceTimeByLine:homeContext.iceTimeByLine,
          playerStats:this.#exportPlayerStats(homeContext,homePlayerStats)
        },
        away:{
          shots:awayShots,
          penalties:awayPenalties.length,
          iceTimeByLine:awayContext.iceTimeByLine,
          playerStats:this.#exportPlayerStats(awayContext,awayPlayerStats)
        }
      }
    };
  }

  #buildTeamContext(team,{isPlayoff=false,coachEffect=null}={}){
    const lines=(team.lines||[]).map((line,lineIndex)=>{
      const playerProfiles=(line.players||[]).filter(Boolean).map((player,slotIndex)=>
        this.#buildMatchProfile(player,line.positions?.[slotIndex]||player.identity?.primaryPosition,{isPlayoff})
      );
      const skaters=playerProfiles.filter(profile=>profile.player.identity?.primaryPosition!=="ВРТ");
      const forwards=skaters.filter(profile=>["ЛНП","ЦТР","ПНП"].includes(getProfilePosition(profile)));
      const defenders=skaters.filter(profile=>getProfilePosition(profile)==="ЗАЩ");
      const fallback=skaters.length?skaters:playerProfiles;
      return {
        lineIndex,
        weight:Number(line.weight)||0.75,
        players:playerProfiles.map(profile=>profile.player),
        playerProfiles,
        skaters:fallback,
        forwards,
        defenders,
        offenseRating:this.#averageWeighted(fallback,profile=>{
          const attrs=this.#getMatchAttributes(profile.player);
          return (profile.effectiveOvr*0.52)+((attrs.shot||0)*profile.gameFactor*0.26)+((attrs.skill||0)*profile.gameFactor*0.17)+((attrs.speed||0)*profile.gameFactor*0.05);
        }),
        defenseRating:this.#averageWeighted(fallback,profile=>{
          const attrs=this.#getMatchAttributes(profile.player);
          return (profile.effectiveOvr*0.54)+((attrs.defense||0)*profile.gameFactor*0.3)+((attrs.physical||0)*profile.gameFactor*0.16);
        })
      };
    }).filter(line=>line.skaters.length>0);

    const goalies=team.getRoster().filter(player=>player.identity?.primaryPosition==="ВРТ");
    const goalie=goalies.sort((a,b)=>b.ovr-a.ovr)[0]||null;
    const goalieProfile=goalie?this.#buildMatchProfile(goalie,"ВРТ"):null;
    const attackRating=this.#weightedLineRating(lines,"offenseRating")*(coachEffect?.attackMultiplier||1);
    const defenseRating=this.#weightedLineRating(lines,"defenseRating")*(coachEffect?.defenseMultiplier||1);
    const playerUsageFactors=this.#buildPlayerUsageFactors(lines);
    const specialTeams=this.#buildSpecialTeams(lines);
    const traitImpact=this.#buildTeamTraitImpact(lines);
    return {
      team,
      lines,
      goalie,
      goalieProfile,
      attackRating,
      defenseRating,
      teamRating:(attackRating*0.55)+(defenseRating*0.45),
      activePlayers:[...new Set(lines.flatMap(line=>line.players).filter(Boolean))],
      activeProfiles:lines.flatMap(line=>line.playerProfiles),
      iceTimeByLine:this.#buildIceTimeByLine(lines),
      playerUsageFactors,
      specialTeams,
      traitImpact,
      coachEffect,
      shiftSchedule:this.#buildShiftSchedule(lines)
    };
  }

  #buildIceTimeByLine(lines){
    if(!lines.length)return [];
    const forwardShares=this.#buildUsageShares(lines,line=>(line.forwards||[]).length,FORWARD_USAGE_WEIGHTS,0.04);
    const defenseShares=this.#buildUsageShares(lines,line=>(line.defenders||[]).length,DEFENSE_USAGE_WEIGHTS,0.035);
    return lines.map((line,index)=>({
      lineIndex:line.lineIndex,
      share:forwardShares[index]||0,
      forwardShare:forwardShares[index]||0,
      defenseShare:defenseShares[index]||0,
      forwardMinutesApprox:Math.round((forwardShares[index]||0)*60*10)/10,
      defenseMinutesApprox:Math.round((defenseShares[index]||0)*60*10)/10
    }));
  }

  #buildShiftSchedule(lines){
    return {
      regulation:{
        forwards:this.#buildGroupSchedule(lines,line=>(line.forwards||[]).length,FORWARD_USAGE_WEIGHTS,FORWARD_SHIFT_BINS,Math.ceil(REGULATION_SECONDS/SHOT_BIN_SECONDS)),
        defenders:this.#buildGroupSchedule(lines,line=>(line.defenders||[]).length,DEFENSE_USAGE_WEIGHTS,DEFENSE_SHIFT_BINS,Math.ceil(REGULATION_SECONDS/SHOT_BIN_SECONDS))
      },
      overtime:{
        forwards:this.#buildOvertimeSchedule(lines,"forwards",Math.ceil(REGULAR_OT_SECONDS/SHOT_BIN_SECONDS)),
        defenders:this.#buildOvertimeSchedule(lines,"defenders",Math.ceil(REGULAR_OT_SECONDS/SHOT_BIN_SECONDS))
      },
      playoffOvertime:{
        forwards:this.#buildGroupSchedule(lines,line=>(line.forwards||[]).length,FORWARD_USAGE_WEIGHTS,FORWARD_SHIFT_BINS,Math.ceil(PLAYOFF_OT_SECONDS/SHOT_BIN_SECONDS)),
        defenders:this.#buildGroupSchedule(lines,line=>(line.defenders||[]).length,DEFENSE_USAGE_WEIGHTS,DEFENSE_SHIFT_BINS,Math.ceil(PLAYOFF_OT_SECONDS/SHOT_BIN_SECONDS))
      }
    };
  }

  #buildGroupSchedule(lines,presenceSelector,baseWeights,shiftBins,binCount){
    const activeIndexes=lines
      .map((line,index)=>presenceSelector(line)?index:-1)
      .filter(index=>index!==-1);
    if(!activeIndexes.length){
      return Array.from({length:binCount},()=>null);
    }
    const shares=this.#buildUsageShares(lines,presenceSelector,baseWeights,0.025);
    const targetBins=shares.map(share=>share*binCount);
    const assignedBins=new Array(lines.length).fill(0);
    const schedule=[];
    let lastIndex=null;
    while(schedule.length<binCount){
      const candidates=activeIndexes.map(index=>{
        const remaining=Math.max(0.25,targetBins[index]-assignedBins[index]);
        const repeatPenalty=lastIndex===index?0.54:1;
        return Math.max(0.05,remaining*repeatPenalty);
      });
      const chosenIndex=this.#pickWeighted(activeIndexes,candidates);
      const chosen=chosenIndex??activeIndexes[0];
      const baseSpan=shiftBins[chosen]??shiftBins[shiftBins.length-1]??4;
      const remainingTarget=Math.max(1,targetBins[chosen]-assignedBins[chosen]);
      const span=clamp(Math.round(baseSpan*rand(0.88,1.18)),1,Math.max(1,Math.round(remainingTarget)+1));
      const actualSpan=Math.min(span,binCount-schedule.length);
      for(let i=0;i<actualSpan;i++){
        schedule.push(chosen);
      }
      assignedBins[chosen]+=actualSpan;
      lastIndex=chosen;
    }
    return schedule;
  }

  #buildOvertimeSchedule(lines,groupField,binCount){
    const candidates=lines
      .map((line,index)=>({
        index,
        line,
        score:(groupField==="forwards")
          ? (line.offenseRating*0.72+line.defenseRating*0.28)
          : (line.defenseRating*0.6+line.offenseRating*0.4)
      }))
      .filter(item=>(item.line[groupField]||[]).length>0)
      .sort((a,b)=>b.score-a.score)
      .slice(0,2);
    if(!candidates.length){
      return Array.from({length:binCount},()=>null);
    }
    const weights=candidates.map((item,index)=>(index===0?0.65:0.35));
    return Array.from({length:binCount},()=>this.#pickWeighted(candidates.map(item=>item.index),weights));
  }

  #buildPlayerUsageFactors(lines){
    const factors=new Map();
    (lines||[]).forEach((line,lineIndex)=>{
      const lineAverage=this.#averageWeighted(line.playerProfiles||[],profile=>profile.effectiveOvr||profile.adjustedOvr||profile.player.ovr||70)||70;
      (line.playerProfiles||[]).forEach(profile=>{
        const relative=(profile.effectiveOvr-lineAverage)/90;
        const formBoost=(((profile.player.condition?.form??profile.player.form) || 1)-1)*0.9;
        const fatiguePenalty=((profile.player.condition?.fatigueScore??profile.player.fatigueScore) || 0)*0.0014;
        const lineupTrust=Math.max(0,0.025-(lineIndex*0.004));
        factors.set(profile.player.id,clamp(1+relative+formBoost-fatiguePenalty+lineupTrust,0.9,1.12));
      });
    });
    return factors;
  }

  #buildSpecialTeams(lines){
    const allProfiles=(lines||[]).flatMap(line=>line.playerProfiles||[]);
    const forwards=allProfiles.filter(profile=>["ЛНП","ЦТР","ПНП"].includes(profile.player.identity?.primaryPosition));
    const defenders=allProfiles.filter(profile=>profile.player.identity?.primaryPosition==="ЗАЩ");
    const offensiveScore=profile=>{
      const attrs=this.#getMatchAttributes(profile.player);
      const traitBoost=hasHiddenTrait(profile.player,HiddenPlayerTrait.POWER_PLAY_SPECIALIST)?1.08:1;
      return (profile.effectiveOvr*0.45+(attrs.shot||0)*0.23+(attrs.skill||0)*0.22+(attrs.speed||0)*0.1)*traitBoost;
    };
    const defensiveScore=profile=>{
      const attrs=this.#getMatchAttributes(profile.player);
      const traitBoost=hasHiddenTrait(profile.player,HiddenPlayerTrait.PENALTY_KILL_SPECIALIST)?1.08:1;
      return (profile.effectiveOvr*0.42+(attrs.defense||0)*0.33+(attrs.physical||0)*0.17+(attrs.speed||0)*0.08)*traitBoost;
    };
    const ppForwards=[...forwards].sort((a,b)=>offensiveScore(b)-offensiveScore(a));
    const ppDefenders=[...defenders].sort((a,b)=>offensiveScore(b)-offensiveScore(a));
    const pkForwards=[...forwards].sort((a,b)=>defensiveScore(b)-defensiveScore(a));
    const pkDefenders=[...defenders].sort((a,b)=>defensiveScore(b)-defensiveScore(a));
    return {
      pp:{
        forwardUnits:[ppForwards.slice(0,3),ppForwards.slice(3,6)].filter(unit=>unit.length),
        defenseUnits:[ppDefenders.slice(0,2),ppDefenders.slice(2,4)].filter(unit=>unit.length)
      },
      pk:{
        forwardUnits:[pkForwards.slice(0,2),pkForwards.slice(2,4)].filter(unit=>unit.length),
        defenseUnits:[pkDefenders.slice(0,2),pkDefenders.slice(2,4)].filter(unit=>unit.length)
      }
    };
  }

  #buildTeamTraitImpact(lines){
    const profiles=(lines||[]).flatMap(line=>line.playerProfiles||[]);
    const ppCount=profiles.filter(profile=>hasHiddenTrait(profile.player,HiddenPlayerTrait.POWER_PLAY_SPECIALIST)).length;
    const pkCount=profiles.filter(profile=>hasHiddenTrait(profile.player,HiddenPlayerTrait.PENALTY_KILL_SPECIALIST)).length;
    const undisciplinedCount=profiles.filter(profile=>hasHiddenTrait(profile.player,HiddenPlayerTrait.UNDISCIPLINED)).length;
    return {
      powerPlay:clamp(1+(ppCount*0.025),1,1.12),
      penaltyKillDefense:clamp(1-(pkCount*0.022),0.9,1),
      penaltyBias:clamp(1+(undisciplinedCount*0.045),1,1.22),
    };
  }

  #estimateExpectedGoals(offense,defense,isHome){
    const goalieRating=defense.goalieProfile?.effectiveOvr||defense.goalie?.ovr||72;
    const attackEdge=(offense.attackRating-defense.defenseRating)/18;
    const depthEdge=(offense.teamRating-defense.teamRating)/26;
    const goalieEdge=(offense.attackRating-goalieRating)/36;
    const homeBoost=isHome?0.16:0;
    return clamp(2.1+homeBoost+attackEdge+depthEdge+goalieEdge,0.65,5.6);
  }

  #buildPenaltyEvents(teamContext,isOvertime){
    const base=(isOvertime?0.25:2.4)*(teamContext.traitImpact?.penaltyBias||1)*(teamContext.coachEffect?.penaltyMultiplier||1);
    const penaltyCount=poissonSample(base+rand(-0.25,0.55));
    const candidateSeconds=Array.from({length:penaltyCount},()=>(
      isOvertime
        ? (REGULATION_SECONDS+Math.floor(rand(0,REGULAR_OT_SECONDS)))
        : this.#randomRegulationSecond()
    )).sort((a,b)=>a-b);
    const events=[];
    for(let i=0;i<candidateSeconds.length;i++){
      const gameSecond=candidateSeconds[i];
      const line=this.#pickLine(teamContext.lines,teamContext.iceTimeByLine);
      const activePenaltyPlayerIds=new Set(
        this.#getActivePenalties(events,gameSecond).map(penalty=>penalty.player?.id).filter(Boolean)
      );
      const player=this.#pickPenaltyPlayer(line?.skaters||[],activePenaltyPlayerIds);
      if(!player)continue;
      events.push(this.#formatEvent({
        penaltyId:`${teamContext.team.id}-${isOvertime?"ot":"reg"}-${i}-${Math.floor(rand(1000,9999))}`,
        type:"penalty",
        gameSecond,
        team:teamContext.team,
        player,
        penaltyMinutes:PENALTY_MINUTES,
        description:`Удаление: ${player.name} (${PENALTY_MINUTES} мин)`
      }));
    }
    return events;
  }

  #buildGoalEvents(teamContext,opponentContext,goalsTarget,opponentPenalties,ownPenalties,isOvertime,overtimeConfig=null){
    const releasedPenaltyIds=new Set();
    const overtimeFormat=overtimeConfig?.format||null;
    const overtimeStartSecond=overtimeConfig?.startSecond??REGULATION_SECONDS;
    const overtimeDurationSeconds=overtimeConfig?.durationSeconds??REGULAR_OT_SECONDS;
    const candidateSeconds=Array.from({length:goalsTarget},()=>(
      isOvertime
        ? (overtimeStartSecond+this.#pickWeightedSecond(overtimeDurationSeconds,sec=>this.#goalSecondWeight(teamContext,opponentContext,overtimeStartSecond+sec,opponentPenalties,ownPenalties,releasedPenaltyIds,overtimeFormat)))
        : this.#pickWeightedSecond(REGULATION_SECONDS,sec=>this.#goalSecondWeight(teamContext,opponentContext,sec,opponentPenalties,ownPenalties,releasedPenaltyIds,false))
    )).sort((a,b)=>a-b);

    const events=[];
    for(const gameSecond of candidateSeconds){
      const ownActivePenalties=this.#getActivePenalties(ownPenalties,gameSecond);
      const opponentActivePenalties=this.#getActivePenalties(opponentPenalties,gameSecond,releasedPenaltyIds);
      const ownSkaters=this.#getSkatersOnIce(ownActivePenalties.length);
      const opponentSkaters=this.#getSkatersOnIce(opponentActivePenalties.length);
      const blockedPlayerIds=new Set(ownActivePenalties.map(penalty=>penalty.player?.id).filter(Boolean));
      const state=this.#getOnIceState(teamContext,gameSecond,ownPenalties,opponentPenalties,new Set(),releasedPenaltyIds,overtimeFormat,true);
      const defendingState=this.#getOnIceState(opponentContext,gameSecond,opponentPenalties,ownPenalties,releasedPenaltyIds,new Set(),overtimeFormat,false);
      const play=this.#pickScoringPlay(state,defendingState,isOvertime,blockedPlayerIds,state.mode);
      if(!play.scorer || blockedPlayerIds.has(play.scorer.id))continue;

      const isPowerPlay=ownSkaters>opponentSkaters;
      const isShortHanded=ownSkaters<opponentSkaters;
      if(isPowerPlay && opponentActivePenalties.length){
        const penaltyToRelease=[...opponentActivePenalties].sort((a,b)=>a.gameSecond-b.gameSecond)[0];
        if(penaltyToRelease?.penaltyId)releasedPenaltyIds.add(penaltyToRelease.penaltyId);
      }

      events.push(this.#formatEvent({
        type:"goal",
        gameSecond,
        team:teamContext.team,
        scorer:play.scorer,
        assists:play.assists.map(player=>player.name),
        assistPlayers:play.assists,
        assist:play.assists[0]?.name||null,
        momentType:play.momentType,
        strength:isOvertime?"OT":(isPowerPlay?"PP":(isShortHanded?"SH":"EV")),
        plusMinusEligible:!isPowerPlay,
        plusPlayerIds:state.profiles.map(profile=>profile.player?.id).filter(Boolean),
        minusPlayerIds:defendingState.profiles.map(profile=>profile.player?.id).filter(Boolean),
        isOvertime,
        overtimeFormat,
        description:play.assists.length?`Гол: ${play.scorer.name} (${play.assists.map(player=>player.name).join(", ")})`:`Гол: ${play.scorer.name}`
      }));
    }
    return {events,releasedPenaltyIds};
  }

  #simulateOvertime(homeContext,awayContext,{isPlayoff=false}={}){
    if(!isPlayoff){
      const result=this.#simulateSuddenDeathSegment(homeContext,awayContext,{
        startSecond:REGULATION_SECONDS,
        durationSeconds:REGULAR_OT_SECONDS,
        format:"regular",
        forceGoal:true
      });
      return {
        ...result,
        durationSeconds:result?.event?.gameSecond||REGULATION_SECONDS+REGULAR_OT_SECONDS,
        overtimePeriods:1,
        format:"regular"
      };
    }

    const maxOvertimePeriods=12;
    for(let overtimePeriod=1;overtimePeriod<=maxOvertimePeriods;overtimePeriod++){
      const result=this.#simulateSuddenDeathSegment(homeContext,awayContext,{
        startSecond:REGULATION_SECONDS+((overtimePeriod-1)*PLAYOFF_OT_SECONDS),
        durationSeconds:PLAYOFF_OT_SECONDS,
        format:"playoffs",
        forceGoal:false
      });
      if(result?.event){
        return {
          ...result,
          durationSeconds:result.event.gameSecond,
          overtimePeriods:overtimePeriod,
          format:"playoffs"
        };
      }
    }

    const fallback=this.#simulateSuddenDeathSegment(homeContext,awayContext,{
      startSecond:REGULATION_SECONDS+((maxOvertimePeriods-1)*PLAYOFF_OT_SECONDS),
      durationSeconds:PLAYOFF_OT_SECONDS,
      format:"playoffs",
      forceGoal:true
    });
    return {
      ...fallback,
      durationSeconds:fallback?.event?.gameSecond||(REGULATION_SECONDS+(maxOvertimePeriods*PLAYOFF_OT_SECONDS)),
      overtimePeriods:maxOvertimePeriods,
      format:"playoffs"
    };
  }

  #simulateSuddenDeathSegment(homeContext,awayContext,{startSecond,durationSeconds,format,forceGoal=false}){
    const homePressure=this.#overtimeAttackRating(homeContext,format);
    const awayPressure=this.#overtimeAttackRating(awayContext,format);
    const totalPressure=Math.max(1,homePressure+awayPressure);
    const goalChance=forceGoal
      ? 1
      : (format==="playoffs"
        ? clamp(0.42+(homePressure+awayPressure-150)/430,0.24,0.7)
        : clamp(0.8+(homePressure+awayPressure-150)/300,0.72,0.96));
    if(Math.random()>goalChance)return null;

    const winnerIsHome=Math.random()<(homePressure/totalPressure);
    const scoringContext=winnerIsHome?homeContext:awayContext;
    const defendingContext=winnerIsHome?awayContext:homeContext;
    const event=this.#buildSingleOvertimeGoalEvent(scoringContext,defendingContext,{
      startSecond,
      durationSeconds,
      format
    });
    if(!event)return null;
    return {teamId:scoringContext.team.id,event};
  }

  #buildSingleOvertimeGoalEvent(teamContext,opponentContext,overtimeConfig){
    for(let attempt=0;attempt<8;attempt++){
      const result=this.#buildGoalEvents(teamContext,opponentContext,1,[],[],true,overtimeConfig);
      if(result.events?.[0])return result.events[0];
    }
    return null;
  }

  #overtimeAttackRating(teamContext,overtimeFormat="regular"){
    const bestSkaters=(teamContext.activeProfiles||[])
      .filter(profile=>profile.player.identity?.primaryPosition!=="ВРТ")
      .sort((a,b)=>{
        const aa=this.#getMatchAttributes(a.player);
        const ab=this.#getMatchAttributes(b.player);
        const sa=a.effectiveOvr+(aa.skill||0)*0.35+(aa.speed||0)*0.35+(aa.shot||0)*0.25;
        const sb=b.effectiveOvr+(ab.skill||0)*0.35+(ab.speed||0)*0.35+(ab.shot||0)*0.25;
        return sb-sa;
      })
      .slice(0,overtimeFormat==="playoffs"?6:4);
    const paceBoost=overtimeFormat==="playoffs"?0.96:1;
    return (this.#averageWeighted(bestSkaters,profile=>profile.effectiveOvr)+this.#averageWeighted(bestSkaters,profile=>{
      const attrs=this.#getMatchAttributes(profile.player);
      return ((attrs.skill||0)+(attrs.speed||0)+(attrs.shot||0))/3;
    }))*paceBoost;
  }

  #goalSecondWeight(teamContext,opponentContext,gameSecond,opponentPenalties,ownPenalties,releasedPenaltyIds,overtimeFormat){
    const sharesByLineIndex=new Map((teamContext.iceTimeByLine||[]).map(item=>[item.lineIndex,item.share]));
    const avgShare=teamContext.lines.length?sum(teamContext.lines.map(line=>sharesByLineIndex.get(line.lineIndex)||line.weight||0.5))/teamContext.lines.length:0.25;
    const matchup=clamp((this.#averageLineOffense(teamContext.lines)-this.#averageLineDefense(opponentContext.lines))/120,-0.12,0.22);
    const baseSkaters=overtimeFormat==="regular"?3:BASE_SKATERS;
    const ownSkaters=this.#getSkatersOnIce(this.#getActivePenalties(ownPenalties,gameSecond).length,baseSkaters);
    const oppSkaters=this.#getSkatersOnIce(this.#getActivePenalties(opponentPenalties,gameSecond,releasedPenaltyIds).length,baseSkaters);
    let specialTeamsTraitMultiplier=1;
    if(ownSkaters>oppSkaters){
      specialTeamsTraitMultiplier=(teamContext.traitImpact?.powerPlay||1)*(opponentContext.traitImpact?.penaltyKillDefense||1);
    }
    const manpowerBoost=this.#manpowerMultiplier(ownSkaters,oppSkaters)*specialTeamsTraitMultiplier;
    const periodBias=overtimeFormat?(overtimeFormat==="playoffs"?1.08:1.2):this.#regulationPeriodBias(gameSecond);
    return Math.max(0.05,(avgShare||0.25)*(1+matchup)*manpowerBoost*periodBias);
  }

  #regulationPeriodBias(gameSecond){
    const sec=Math.max(0,Math.min(REGULATION_SECONDS-1,gameSecond));
    const period=Math.floor(sec/PERIOD_SECONDS)+1;
    if(period===1)return rand(0.9,1.05);
    if(period===2)return rand(0.95,1.1);
    return rand(0.95,1.18);
  }

  #getActivePenalties(penalties,second,releasedPenaltyIds=new Set()){
    return (penalties||[]).filter(penalty=>{
      if(!penalty?.penaltyId || releasedPenaltyIds.has(penalty.penaltyId))return false;
      const end=penalty.gameSecond+(penalty.penaltyMinutes||PENALTY_MINUTES)*60;
      return second>=penalty.gameSecond && second<end;
    });
  }

  #getSkatersOnIce(activePenaltyCount,baseSkaters=BASE_SKATERS){
    const activeMinors=Math.max(0,Number(activePenaltyCount)||0);
    return Math.max(3,baseSkaters-Math.min(2,activeMinors));
  }

  #manpowerMultiplier(ownSkaters,oppSkaters){
    const diff=ownSkaters-oppSkaters;
    if(diff>=2)return 2.35;
    if(diff===1)return 1.7;
    if(diff===-1)return 0.62;
    if(diff<=-2)return 0.38;
    return 1;
  }

  #averageLineOffense(lines){
    if(!lines?.length)return 70;
    return sum(lines.map(line=>line.offenseRating||70))/lines.length;
  }

  #averageLineDefense(lines){
    if(!lines?.length)return 70;
    return sum(lines.map(line=>line.defenseRating||70))/lines.length;
  }

  #pickPenaltyPlayer(profiles,blockedPlayerIds=new Set()){
    const eligibleProfiles=(profiles||[]).filter(profile=>profile?.player && !blockedPlayerIds.has(profile.player.id));
    if(!eligibleProfiles.length)return null;
    const weights=eligibleProfiles.map(profile=>{
      const attrs=this.#getMatchAttributes(profile.player);
      const traitRisk=hasHiddenTrait(profile.player,HiddenPlayerTrait.UNDISCIPLINED)?1.65:1;
      const risk=(1+((attrs.physical||65)-70)*0.02+((attrs.defense||65)-70)*0.01)*traitRisk;
      return clamp(risk*(2-profile.gameFactor),0.35,2.2);
    });
    return this.#pickWeighted(eligibleProfiles,weights)?.player||null;
  }

  #pickMomentType(attackingState,defendingState,isOvertime,mode){
    const forwardLineIndex=attackingState?.forwardLineIndex??0;
    const defensePressure=this.#getDefensivePressure(defendingState?.profiles||[],defendingState?.mode);
    const baseMoments=mode==="pp"
      ? [
          {type:"one_timer",weight:0.3},
          {type:"slot",weight:0.2},
          {type:"point_shot",weight:0.18},
          {type:"cycle",weight:0.08},
          {type:"rebound",weight:0.14}
        ]
      : mode==="pk"
        ? [
            {type:"rush",weight:0.34},
            {type:"slot",weight:0.14},
            {type:"point_shot",weight:0.18},
            {type:"cycle",weight:0.18},
            {type:"rebound",weight:0.16}
          ]
        : isOvertime
          ? [
              {type:"rush",weight:0.36},
              {type:"slot",weight:0.24},
              {type:"one_timer",weight:0.1},
              {type:"cycle",weight:0.14},
              {type:"rebound",weight:0.16}
            ]
          : [
              {type:"slot",weight:0.31},
              {type:"rush",weight:0.2},
              {type:"point_shot",weight:0.1},
              {type:"cycle",weight:0.18},
              {type:"rebound",weight:0.21}
            ];
    const adjusted=baseMoments.map(moment=>{
      let weight=moment.weight;
      if(forwardLineIndex>=3 && mode==="ev"){
        if(["slot","rush","one_timer","rebound"].includes(moment.type))weight*=0.8;
        if(["point_shot","cycle"].includes(moment.type))weight*=1.18;
      }
      if(defensePressure>=79){
        if(["slot","rush","one_timer"].includes(moment.type))weight*=0.84;
        if(["point_shot","cycle"].includes(moment.type))weight*=1.12;
      }else if(defensePressure<=71){
        if(["slot","rush","one_timer","rebound"].includes(moment.type))weight*=1.08;
      }
      return {...moment,weight};
    });
    return this.#pickWeighted(adjusted.map(moment=>moment.type),adjusted.map(moment=>moment.weight))||"cycle";
  }

  #getIndividualXgWeight(profile,momentType,mode,attackingState,defendingState,isOvertime){
    const attrs=this.#getMatchAttributes(profile.player);
    const position=getProfilePosition(profile);
    const defensePressure=this.#getDefensivePressure(defendingState?.profiles||[],defendingState?.mode);
    const traitModeFactor=(mode==="pp"&&hasHiddenTrait(profile.player,HiddenPlayerTrait.POWER_PLAY_SPECIALIST))
      ? 1.13
      : ((mode==="pk"&&hasHiddenTrait(profile.player,HiddenPlayerTrait.PENALTY_KILL_SPECIALIST))?1.08:1);
    const modeFactor=(mode==="pp"?1.08:(mode==="ot"?1.06:(mode==="pk"?0.8:1)))*traitModeFactor;
    const otFactor=isOvertime?((attrs.speed||60)*0.08+(attrs.skill||60)*0.06):0;
    let weight=profile.effectiveOvr*0.18+(attrs.shot||60)*0.38+(attrs.skill||60)*0.18+(attrs.speed||60)*0.12+(attrs.physical||60)*0.08;

    if(momentType==="rush")weight+=(attrs.speed||60)*0.2+(attrs.skill||60)*0.08;
    if(momentType==="slot")weight+=(attrs.shot||60)*0.16+(attrs.skill||60)*0.1;
    if(momentType==="rebound")weight+=(attrs.physical||60)*0.16+(attrs.shot||60)*0.1;
    if(momentType==="cycle")weight+=(attrs.skill||60)*0.12+(attrs.physical||60)*0.1;
    if(momentType==="one_timer")weight+=(attrs.shot||60)*0.22+(attrs.skill||60)*0.08;
    if(momentType==="point_shot")weight+=(attrs.shot||60)*0.14+(attrs.skill||60)*0.06;

    if(position==="ЗАЩ"){
      if(mode==="pp" && momentType==="point_shot")weight*=1.16;
      else if(momentType==="point_shot")weight*=1.08;
      else if(mode==="ev")weight*=0.46;
      else weight*=0.62;
    }else{
      if(momentType==="point_shot" && mode!=="pp")weight*=0.86;
      if(mode==="pp" && ["one_timer","slot"].includes(momentType))weight*=1.08;
    }

    if((attackingState?.forwardLineIndex??0)>=3 && mode==="ev" && ["slot","rush","one_timer","rebound"].includes(momentType)){
      weight*=0.78;
    }

    const suppression=clamp(1-((defensePressure-72)/160),0.84,1.06);
    return Math.max(0.1,(weight+otFactor)*modeFactor*suppression);
  }

  #buildScorerPool(skaters,momentType,mode,isOvertime,defenderIds=new Set()){
    const defenders=skaters.filter(profile=>getProfilePosition(profile)==="ЗАЩ");
    const forwards=skaters.filter(profile=>getProfilePosition(profile)!=="ЗАЩ");
    if(!defenders.length || !forwards.length)return skaters;
    if(isOvertime)return forwards;
    if(mode==="pp"){
      if(momentType==="point_shot")return [...forwards,...defenders];
      return forwards;
    }
    if(mode==="pk")return forwards;
    if(momentType==="point_shot")return [...forwards,...defenders.slice(0,1)];
    if(momentType==="rebound")return [...forwards,...defenders.slice(0,1)];
    return forwards;
  }

  #getAssistWeight(profile,momentType,mode,attackingState){
    const attrs=this.#getMatchAttributes(profile.player);
    const position=getProfilePosition(profile);
    let weight=profile.effectiveOvr*0.34+(attrs.skill||60)*0.42+(attrs.speed||60)*0.12+(attrs.defense||60)*0.06;
    if(["rush","cycle"].includes(momentType))weight+=(attrs.speed||60)*0.08;
    if(["slot","one_timer"].includes(momentType))weight+=(attrs.skill||60)*0.08;
    if(momentType==="point_shot" && position==="ЗАЩ")weight*=1.18;
    if((attackingState?.forwardLineIndex??0)>=3 && mode==="ev")weight*=0.86;
    if(mode==="pp")weight*=1.06;
    if(hasHiddenTrait(profile.player,HiddenPlayerTrait.PLAYMAKER))weight*=1.18;
    if(mode==="pp"&&hasHiddenTrait(profile.player,HiddenPlayerTrait.POWER_PLAY_SPECIALIST))weight*=1.08;
    return Math.max(0.1,weight);
  }

  #getSecondAssistChance(momentType,isOvertime,mode){
    let chance=isOvertime?0.34:0.56;
    if(["cycle","point_shot"].includes(momentType))chance+=0.1;
    if(["rush","rebound"].includes(momentType))chance-=0.08;
    if(mode==="pp")chance+=0.06;
    return clamp(chance,0.18,0.72);
  }

  #getDefensivePressure(profiles,mode="ev"){
    const defenders=(profiles||[]).filter(profile=>profile.player.identity?.primaryPosition==="ЗАЩ");
    const skaters=(profiles||[]).filter(profile=>profile.player.identity?.primaryPosition!=="ВРТ");
    const defenseCore=this.#averageWeighted(defenders.length?defenders:skaters,profile=>{
      const attrs=this.#getMatchAttributes(profile.player);
      const suppressorBoost=hasHiddenTrait(profile.player,HiddenPlayerTrait.ATTACK_SUPPRESSOR)?4.5:0;
      const pkBoost=mode==="pk"&&hasHiddenTrait(profile.player,HiddenPlayerTrait.PENALTY_KILL_SPECIALIST)?3:0;
      return profile.effectiveOvr*0.32+(attrs.defense||60)*0.46+(attrs.physical||60)*0.16+(attrs.speed||60)*0.06+suppressorBoost+pkBoost;
    });
    return defenseCore||72;
  }

  #getShotGenerationWeight(profile,mode,teamContext,momentType){
    const attrs=this.#getMatchAttributes(profile.player);
    const position=getProfilePosition(profile);
    const lineIndex=this.#findPlayerLineIndex(teamContext,profile.player.id);
    let weight=profile.effectiveOvr*0.18+(attrs.shot||60)*0.42+(attrs.skill||60)*0.16+(attrs.speed||60)*0.1+(attrs.physical||60)*0.04;
    if(position==="ЗАЩ"){
      if(mode==="pp" || momentType==="point_shot")weight*=1.05;
      else weight*=0.62;
    }else if(momentType==="point_shot"){
      weight*=0.88;
    }
    if(lineIndex>=3 && mode==="ev")weight*=0.78;
    if(mode==="pp" && position!=="ЗАЩ")weight*=1.08;
    if(mode==="pp"&&hasHiddenTrait(profile.player,HiddenPlayerTrait.POWER_PLAY_SPECIALIST))weight*=1.1;
    return Math.max(0.1,weight);
  }

  #findPlayerLineIndex(teamContext,playerId){
    for(let index=0;index<(teamContext?.lines||[]).length;index++){
      if((teamContext.lines[index]?.players||[]).some(player=>player?.id===playerId))return index;
    }
    return 0;
  }

  #pickScoringPlay(attackingState,defendingState,isOvertime,blockedPlayerIds=new Set(),mode="ev"){
    const skaters=(attackingState?.profiles||[]).filter(profile=>profile?.player && !blockedPlayerIds.has(profile.player.id));
    if(!skaters.length)return {scorer:null,assists:[],momentType:"cycle"};

    const momentType=this.#pickMomentType(attackingState,defendingState,isOvertime,mode);
    const scorerPool=this.#buildScorerPool(skaters,momentType,mode,isOvertime,attackingState?.defenderIds);
    const scorerProfile=this.#pickWeighted(scorerPool,scorerPool.map(profile=>
      this.#getIndividualXgWeight(profile,momentType,mode,attackingState,defendingState,isOvertime)
    ));
    const scorer=scorerProfile?.player||null;
    if(!scorer)return {scorer:null,assists:[],momentType};

    const assistPool=skaters.filter(profile=>profile.player.id!==scorer.id);
    const firstAssistProfile=this.#pickWeighted(assistPool,assistPool.map(profile=>
      this.#getAssistWeight(profile,momentType,mode,attackingState)
    ));
    const firstAssist=firstAssistProfile?.player||null;
    const secondAssistChance=clamp(
      this.#getSecondAssistChance(momentType,isOvertime,mode)+(skaters.some(profile=>hasHiddenTrait(profile.player,HiddenPlayerTrait.PLAYMAKER))?0.04:0),
      0.18,
      0.76
    );
    let secondAssist=null;
    if(Math.random()<secondAssistChance){
      const secondPool=assistPool.filter(profile=>profile.player.id!==firstAssist?.id);
      secondAssist=this.#pickWeighted(secondPool,secondPool.map(profile=>
        this.#getAssistWeight(profile,momentType,mode,attackingState)*0.92
      ))?.player||null;
    }
    return {scorer,assists:[firstAssist,secondAssist].filter(Boolean),momentType};
  }

  #estimateShots(goals,xg,durationSeconds){
    const overtimeSeconds=Math.max(0,(Number(durationSeconds)||REGULATION_SECONDS)-REGULATION_SECONDS);
    const otBonus=(overtimeSeconds/PERIOD_SECONDS)*rand(2.2,4.8);
    return Math.max(goals+8,Math.round((xg*8.2)+rand(0,5)+otBonus));
  }

  #createPlayerStatsMap(teamContext){
    const stats=new Map();
    const activePlayers=[...new Set([...(teamContext.activePlayers||[]),teamContext.goalie].filter(Boolean))];
    activePlayers.forEach(player=>{
      stats.set(player.id,{playerId:player.id,playerName:player.name,games:1,goals:0,assists:0,shots:0,totalIceTime:0,penaltyMinutes:0,plusMinus:0});
    });
    return stats;
  }

  #applyIceTimeStats(teamContext,statsMap,durationSeconds,ownPenalties,opponentPenalties,releasedOwnPenaltyIds=new Set(),releasedOpponentPenaltyIds=new Set(),overtimeFormat=null){
    const scheduleSeconds=Math.min(durationSeconds,REGULATION_SECONDS);
    for(let second=0;second<scheduleSeconds;second+=SHOT_BIN_SECONDS){
      const activeState=this.#getOnIceState(
        teamContext,
        second,
        ownPenalties,
        opponentPenalties,
        releasedOwnPenaltyIds,
        releasedOpponentPenaltyIds,
        false,
        true
      );
      this.#assignShiftBinIceTime(activeState.profiles,statsMap,Math.min(SHOT_BIN_SECONDS,scheduleSeconds-second),teamContext.playerUsageFactors);
    }

    if(durationSeconds>REGULATION_SECONDS){
      for(let second=REGULATION_SECONDS;second<durationSeconds;second+=SHOT_BIN_SECONDS){
        const activeState=this.#getOnIceState(
          teamContext,
          second,
          ownPenalties,
          opponentPenalties,
          releasedOwnPenaltyIds,
          releasedOpponentPenaltyIds,
          overtimeFormat,
          true
        );
        this.#assignShiftBinIceTime(activeState.profiles,statsMap,Math.min(SHOT_BIN_SECONDS,durationSeconds-second),teamContext.playerUsageFactors);
      }
    }

    if(teamContext.goalie && statsMap.has(teamContext.goalie.id)){
      statsMap.get(teamContext.goalie.id).totalIceTime=durationSeconds;
    }
  }

  #applyGoalEventStats(goalEvents,statsMap){
    (goalEvents||[]).forEach(event=>{
      const scorerId=event?.scorer?.id;
      if(scorerId && statsMap.has(scorerId))statsMap.get(scorerId).goals++;
      (event?.assistPlayers||[]).forEach(player=>{
        if(player?.id && statsMap.has(player.id))statsMap.get(player.id).assists++;
      });
      if(event?.plusMinusEligible){
        (event.plusPlayerIds||[]).forEach(playerId=>{
          if(statsMap.has(playerId))statsMap.get(playerId).plusMinus++;
        });
        (event.minusPlayerIds||[]).forEach(playerId=>{
          if(statsMap.has(playerId))statsMap.get(playerId).plusMinus--;
        });
      }
    });
  }

  #applyPenaltyEventStats(penaltyEvents,statsMap){
    (penaltyEvents||[]).forEach(event=>{
      const playerId=event?.player?.id;
      if(playerId && statsMap.has(playerId)){
        statsMap.get(playerId).penaltyMinutes+=(event.penaltyMinutes||PENALTY_MINUTES);
      }
    });
  }

  #applyShotStats(teamContext,statsMap,totalShots,goalEvents=[]){
    const shooters=(teamContext.activeProfiles||[]).filter(profile=>profile.player.identity?.primaryPosition!=="ВРТ");
    if(!shooters.length)return;
    const goalMomentCounts=new Map();
    (goalEvents||[]).forEach(event=>{
      const playerId=event?.scorer?.id;
      if(!playerId)return;
      const key=`${playerId}:${event.momentType||"slot"}`;
      goalMomentCounts.set(key,(goalMomentCounts.get(key)||0)+1);
    });
    const weights=shooters.map(profile=>{
      const iceTimeFactor=(statsMap.get(profile.player.id)?.totalIceTime||0)/Math.max(1,REGULATION_SECONDS*0.18);
      const baseWeight=this.#getShotGenerationWeight(profile,"ev",teamContext,null);
      const goalBoost=(goalMomentCounts.get(`${profile.player.id}:slot`)||0)*0.45+
        (goalMomentCounts.get(`${profile.player.id}:rush`)||0)*0.35+
        (goalMomentCounts.get(`${profile.player.id}:one_timer`)||0)*0.4+
        (goalMomentCounts.get(`${profile.player.id}:point_shot`)||0)*0.25+
        (goalMomentCounts.get(`${profile.player.id}:rebound`)||0)*0.2;
      return Math.max(0.1,baseWeight*(0.74+iceTimeFactor*0.26)+goalBoost);
    });
    const allocated=new Map(shooters.map(profile=>[profile.player.id,0]));

    shooters.forEach(profile=>{
      const playerStats=statsMap.get(profile.player.id);
      if(playerStats?.goals)allocated.set(profile.player.id,playerStats.goals);
    });

    let remainingShots=Math.max(0,totalShots-sum([...allocated.values()]));
    while(remainingShots>0){
      const shooter=this.#pickWeighted(shooters,weights)?.player;
      if(!shooter)break;
      allocated.set(shooter.id,(allocated.get(shooter.id)||0)+1);
      remainingShots--;
    }

    allocated.forEach((shots,playerId)=>{
      if(statsMap.has(playerId))statsMap.get(playerId).shots=shots;
    });
  }

  #exportPlayerStats(teamContext,statsMap){
    const rosterMap=new Map((teamContext?.team?.getRoster?.()||[]).map(player=>[player.id,player]));
    return [...statsMap.values()].map(stat=>({
      ...stat,
      playerName:stat.playerName||rosterMap.get(stat.playerId)?.name||"Игрок"
    }));
  }

  #formatEvent(data){
    const gameSecond=Math.max(0,Math.floor(data.gameSecond));
    const inOt=gameSecond>=REGULATION_SECONDS;
    const overtimeFormat=data.overtimeFormat||null;
    const overtimePeriodLength=overtimeFormat==="playoffs"?PLAYOFF_OT_SECONDS:REGULAR_OT_SECONDS;
    const period=inOt
      ? (overtimeFormat==="playoffs"
        ? (4+Math.floor((gameSecond-REGULATION_SECONDS)/overtimePeriodLength))
        : 4)
      : (Math.floor(gameSecond/PERIOD_SECONDS)+1);
    const periodSecond=inOt
      ? (overtimeFormat==="playoffs"
        ? ((gameSecond-REGULATION_SECONDS)%overtimePeriodLength)
        : (gameSecond-REGULATION_SECONDS))
      : (gameSecond%PERIOD_SECONDS);
    const minuteAbsolute=Math.floor(gameSecond/60)+1;
    const secondInMinute=periodSecond%60;
    const elapsed=Math.max(0,periodSecond);
    const mm=String(Math.floor(elapsed/60)).padStart(2,"0");
    const ss=String(elapsed%60).padStart(2,"0");
    return {
      ...data,
      gameSecond,
      period,
      minute:minuteAbsolute,
      second:secondInMinute,
      periodClock:`${mm}:${ss}`,
      teamId:data.team?.id||data.teamId||null,
      team:data.team?.name||data.team||""
    };
  }

  #randomRegulationSecond(){
    return Math.floor(Math.random()*REGULATION_SECONDS);
  }

  #eventPriority(event){
    if(event.type==="penalty")return 0;
    if(event.type==="goal")return 1;
    return 2;
  }

  #averageWeighted(items,extractor){
    if(!items?.length)return 0;
    return sum(items.map(item=>extractor(item)))/items.length;
  }

  #weightedLineRating(lines,field){
    if(!lines?.length)return 68;
    const totalWeight=sum(lines.map(line=>line.weight||0.75))||1;
    return sum(lines.map(line=>(line[field]||68)*(line.weight||0.75)))/totalWeight;
  }

  #getMatchAttributes(player){
    const attrs=player?.effectiveAttributesJson||player?.attributes?.attributesJson||{};
    const moodModifier=player?.moodModifier??1;
    return {
      shot:(attrs.shot||0)*moodModifier,
      speed:(attrs.speed||0)*moodModifier,
      physical:(attrs.physical||0)*moodModifier,
      defense:(attrs.defense||0)*moodModifier,
      skill:(attrs.skill||0)*moodModifier,
      reflexes:(attrs.reflexes||0)*moodModifier,
      positioning:(attrs.positioning||0)*moodModifier,
      glove:(attrs.glove||0)*moodModifier,
      blocker:(attrs.blocker||0)*moodModifier,
      reboundControl:(attrs.reboundControl||0)*moodModifier,
    };
  }

  #buildMatchProfile(player,slotPosition,{isPlayoff=false}={}){
    const adjustedOvr=adjustedOvrForPosition(player,slotPosition);
    const gameFactor=this.#rollGameFactor(player,{isPlayoff});
    return {
      player,
      slotPosition,
      adjustedOvr,
      gameFactor,
      effectiveOvr:adjustedOvr*player.form*gameFactor
    };
  }

  #getOnIceState(teamContext,gameSecond,ownPenalties,opponentPenalties,releasedOwnPenaltyIds=new Set(),releasedOpponentPenaltyIds=new Set(),overtimeFormat=null,lateGamePush=false){
    const ownActivePenalties=this.#getActivePenalties(ownPenalties,gameSecond,releasedOwnPenaltyIds);
    const opponentActivePenalties=this.#getActivePenalties(opponentPenalties,gameSecond,releasedOpponentPenaltyIds);
    const blockedPlayerIds=new Set(ownActivePenalties.map(penalty=>penalty.player?.id).filter(Boolean));
    const baseSkaters=overtimeFormat==="regular"?3:BASE_SKATERS;
    const ownSkaters=this.#getSkatersOnIce(ownActivePenalties.length,baseSkaters);
    const opponentSkaters=this.#getSkatersOnIce(opponentActivePenalties.length,baseSkaters);
    if(ownSkaters!==opponentSkaters){
      const mode=ownSkaters>opponentSkaters?"pp":"pk";
      return {
        mode,
        ownSkaters,
        opponentSkaters,
        ...this.#pickSpecialTeamsProfiles(teamContext,mode,ownSkaters,gameSecond,blockedPlayerIds),
        forwardLineIndex:0,
        defenseLineIndex:0
      };
    }
    if(overtimeFormat){
      return {
        mode:"ot",
        ownSkaters,
        opponentSkaters,
        ...this.#pickScheduledProfiles(teamContext,gameSecond,overtimeFormat,true,blockedPlayerIds,ownSkaters)
      };
    }
    return {
      mode:gameSecond>=REGULATION_SECONDS-LATE_GAME_PUSH_SECONDS&&lateGamePush?"push":"ev",
      ownSkaters,
      opponentSkaters,
      ...this.#pickScheduledProfiles(
        teamContext,
        gameSecond,
        null,
        gameSecond>=REGULATION_SECONDS-LATE_GAME_PUSH_SECONDS&&lateGamePush,
        blockedPlayerIds,
        ownSkaters,
      )
    };
  }

  #pickScheduledProfiles(teamContext,gameSecond,overtimeFormat=null,lateGamePush=false,blockedPlayerIds=new Set(),skaterCountOverride=null){
    const schedule=overtimeFormat==="regular"
      ? teamContext.shiftSchedule?.overtime
      : overtimeFormat==="playoffs"
        ? teamContext.shiftSchedule?.playoffOvertime
        : teamContext.shiftSchedule?.regulation;
    const scheduleSecond=overtimeFormat?(gameSecond-REGULATION_SECONDS):gameSecond;
    const forwardLength=Math.max(1,schedule?.forwards?.length||1);
    const defenseLength=Math.max(1,schedule?.defenders?.length||1);
    const forwardBinIndex=Math.max(0,Math.floor(scheduleSecond/SHOT_BIN_SECONDS)%forwardLength);
    const defenseBinIndex=Math.max(0,Math.floor(scheduleSecond/SHOT_BIN_SECONDS)%defenseLength);
    let forwardIndex=schedule?.forwards?.[forwardBinIndex]??0;
    let defenseIndex=schedule?.defenders?.[defenseBinIndex]??0;
    if(lateGamePush && teamContext.lines.length>1){
      if(Math.random()<0.32)forwardIndex=0;
      if(Math.random()<0.24)defenseIndex=0;
    }
    const forwardProfiles=teamContext.lines[forwardIndex]?.forwards||teamContext.lines[forwardIndex]?.skaters||[];
    const defenseProfiles=teamContext.lines[defenseIndex]?.defenders||[];
    const isRegularOvertime=overtimeFormat==="regular";
    const targetSkaters=skaterCountOverride|| (isRegularOvertime?3:5);
    const profiles=isRegularOvertime
      ? [...forwardProfiles.slice(0,2),...defenseProfiles.slice(0,1)]
      : [...forwardProfiles.slice(0,3),...defenseProfiles.slice(0,2)];
    const resolvedProfiles=profiles.length?profiles:(teamContext.activeProfiles||[]).slice(0,targetSkaters);
    const availableProfiles=(teamContext.activeProfiles||[]).filter(profile=>profile?.player && !blockedPlayerIds.has(profile.player.id));
    return {
      forwardLineIndex:forwardIndex,
      defenseLineIndex:defenseIndex,
      ...this.#finalizeOnIceProfiles(resolvedProfiles,availableProfiles,blockedPlayerIds,targetSkaters)
    };
  }

  #pickSpecialTeamsProfiles(teamContext,mode,skaterCount,gameSecond,blockedPlayerIds=new Set()){
    const units=teamContext.specialTeams?.[mode];
    if(!units)return {profiles:[],defenderIds:new Set()};
    const usePrimary=((Math.floor(gameSecond/SHOT_BIN_SECONDS)%3)!==2)
      ? true
      : Math.random()<(mode==="pp"?PP_UNIT_SHARE:PK_UNIT_SHARE);
    const forwardUnit=units.forwardUnits?.[usePrimary?0:1]||units.forwardUnits?.[0]||[];
    const defenseUnit=units.defenseUnits?.[usePrimary?0:1]||units.defenseUnits?.[0]||[];
    const baseProfiles=mode==="pp"
      ? (skaterCount>=5
        ? [...forwardUnit.slice(0,3),...defenseUnit.slice(0,2)]
        : skaterCount===4
          ? [...forwardUnit.slice(0,2),...defenseUnit.slice(0,2)]
          : [...forwardUnit.slice(0,2),...defenseUnit.slice(0,1)])
      : (skaterCount>=4
        ? [...forwardUnit.slice(0,2),...defenseUnit.slice(0,2)]
        : [...forwardUnit.slice(0,1),...defenseUnit.slice(0,2)]);
    const fallbackPool=[...forwardUnit,...defenseUnit];
    for(const profile of fallbackPool){
      if(baseProfiles.length>=skaterCount)break;
      if(baseProfiles.some(item=>item.player.id===profile.player.id))continue;
      baseProfiles.push(profile);
    }
    const availableProfiles=(teamContext.activeProfiles||[]).filter(profile=>profile?.player && !blockedPlayerIds.has(profile.player.id));
    return this.#finalizeOnIceProfiles(baseProfiles.slice(0,skaterCount),availableProfiles,blockedPlayerIds,skaterCount);
  }

  #finalizeOnIceProfiles(baseProfiles,availableProfiles,blockedPlayerIds,targetSkaters){
    const profiles=(baseProfiles||[])
      .filter(profile=>profile?.player && !blockedPlayerIds.has(profile.player.id));
    for(const profile of availableProfiles||[]){
      if(profiles.length>=targetSkaters)break;
      if(profiles.some(item=>item.player.id===profile.player.id))continue;
      profiles.push(profile);
    }
    const trimmed=profiles.slice(0,targetSkaters);
    return {
      profiles:trimmed,
      defenderIds:new Set(
        trimmed
          .filter(profile=>getProfilePosition(profile)==="ЗАЩ")
          .map(profile=>profile.player.id)
      )
    };
  }

  #assignShiftBinIceTime(profiles,statsMap,seconds,usageFactors){
    if(!profiles?.length || !seconds)return;
    const weights=profiles.map(profile=>usageFactors?.get(profile.player.id)||1);
    const averageWeight=(sum(weights)/weights.length)||1;
    profiles.forEach((profile,index)=>{
      const playerStats=statsMap.get(profile.player.id);
      if(!playerStats)return;
      playerStats.totalIceTime+=Math.round(seconds*(weights[index]/averageWeight));
    });
  }

  #rollGameFactor(player,{isPlayoff=false}={}){
    const age=calculateAge(player.identity?.birthDate);
    const ovr=Number(player.ovr)||0;
    const traitFactor=isPlayoff&&hasHiddenTrait(player,HiddenPlayerTrait.PLAYOFF_CHOKER)?0.965:1;
    if(age<=19 && ovr<74){
      return clamp(rand(0.82,1.04)*traitFactor,0.8,1.05);
    }
    if(age<=22 && ovr<77){
      return clamp(rand(0.9,1.05)*traitFactor,0.88,1.06);
    }
    return clamp(rand(0.96,1.04)*traitFactor,0.94,1.05);
  }

  #pickLine(lines,iceTimeByLine){
    const shares=new Map((iceTimeByLine||[]).map(item=>[item.lineIndex,item.share]));
    const weights=(lines||[]).map(line=>Math.max(0.05,shares.get(line.lineIndex)||line.weight||0.5));
    return this.#pickWeighted(lines,weights);
  }

  #buildUsageShares(lines,presenceSelector,baseWeights,jitterAmount){
    const presentIndexes=lines
      .map((line,index)=>presenceSelector(line)?index:-1)
      .filter(index=>index!==-1);
    if(!presentIndexes.length){
      return lines.map(()=>0);
    }
    const raw=new Array(lines.length).fill(0);
    presentIndexes.forEach(index=>{
      const base=baseWeights[index]??baseWeights[baseWeights.length-1]??0.1;
      raw[index]=Math.max(0.02,base*(1+rand(-jitterAmount,jitterAmount)));
    });
    const total=sum(raw)||1;
    return raw.map(value=>value/total);
  }

  #pickWeightedSecond(durationSeconds,weightFn){
    const binCount=Math.max(1,Math.ceil(durationSeconds/SHOT_BIN_SECONDS));
    const bins=Array.from({length:binCount},(_,index)=>index);
    const weights=bins.map(index=>{
      const sec=index*SHOT_BIN_SECONDS+rand(0,SHOT_BIN_SECONDS-1);
      return Math.max(0.01,weightFn(sec));
    });
    const pickedBin=this.#pickWeighted(bins,weights)??0;
    const base=pickedBin*SHOT_BIN_SECONDS;
    return Math.min(durationSeconds-1,base+Math.floor(rand(0,SHOT_BIN_SECONDS)));
  }

  #pickWeighted(items,weights){
    if(!items?.length)return null;
    const safe=(weights||[]).map(weight=>Math.max(0,Number(weight)||0));
    const total=sum(safe);
    if(total<=0)return items[Math.floor(Math.random()*items.length)]||null;
    let roll=Math.random()*total;
    for(let i=0;i<items.length;i++){
      roll-=safe[i]||0;
      if(roll<=0)return items[i];
    }
    return items[items.length-1]||null;
  }
}
