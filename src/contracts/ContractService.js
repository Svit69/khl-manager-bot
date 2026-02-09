import { generateUuid } from "../utils/uuid.js";
import { ContractType, contractTypeLabel } from "./ContractType.js";
const parseSeasonStart=season=>Number((season||"0/0").split("/")[0])||0;
const parseSeasonEnd=season=>Number((season||"0/0").split("/")[1])||0;
const formatNextSeason=season=>{const start=parseSeasonStart(season);return `${start+1}/${start+2}`;};
const formatContractEndDate=season=>{const endYear=Number((season||"0/0").split("/")[1])||0;return endYear?`31.05.${endYear}`:null;};
const calculateAge=birthDate=>{
  const now=new Date(),birth=new Date(birthDate);let age=now.getUTCFullYear()-birth.getUTCFullYear();
  const hasBirthdayPassed=(now.getUTCMonth()>birth.getUTCMonth())||(now.getUTCMonth()===birth.getUTCMonth()&&now.getUTCDate()>=birth.getUTCDate());
  return hasBirthdayPassed?age:age-1;
};
const normalizeType=type=>Object.values(ContractType).includes(type)?type:ContractType.ONE_WAY;
const normalizeContract=contract=>{
  if(!contract||!contract.id||!contract.season||(!contract.playerId&&!contract.teamId))return null;
  return {...contract,type:normalizeType(contract.type)};
};
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const getUfaStatus=(age,khlGamesPlayed)=>{
  if(age>=29)return "NSA";
  if(age>=28 && (khlGamesPlayed||0)>=250)return "NSA";
  return "OSA";
};
const getLineInfo=(team,player)=>{
  for(let i=0;i<team.lines.length;i++){
    const line=team.lines[i];
    const idx=line.players.indexOf(player);
    if(idx!==-1){
      return {lineIndex:i+1,slotPosition:line.positions?.[idx]||null};
    }
  }
  return {lineIndex:null,slotPosition:null};
};
const estimateMarketSalary=(player,lastContract)=>{
  if(lastContract?.salaryRub)return lastContract.salaryRub;
  return Math.max(1000000,Math.round(player.ovr*1000000));
};
const roleFitScore=(player,team,reasons)=>{
  let score=0;
  const expected=player.expectedLineIndex||null;
  const {lineIndex,slotPosition}=getLineInfo(team,player);
  if(expected&&lineIndex){
    if(lineIndex===expected){score+=10;reasons.push({text:"Играет в ожидаемом звене",value:10});}
    else if(lineIndex>expected){score-=10;reasons.push({text:"Играет ниже ожиданий",value:-10});}
    else {score+=5;reasons.push({text:"Играет выше ожиданий",value:5});}
  }
  if(slotPosition && slotPosition!==player.identity?.primaryPosition){
    const secondary=player.identity?.secondaryPositions||[];
    if(secondary.includes(slotPosition)){score-=5;reasons.push({text:"Стабильно на доп. позиции",value:-5});}
  }
  return score;
};
const teamPerformanceScore=(reasons)=>{
  const score=0;
  reasons.push({text:"Командные результаты нейтральны",value:0});
  return score;
};
const personalPerformanceScore=(player,reasons)=>{
  const games=player.seasonStats?.games||0;
  if(games<5){reasons.push({text:"Недостаточно матчей для оценки",value:0});return 0;}
  const points=(player.seasonStats?.goals||0)+(player.seasonStats?.assists||0);
  const ppg=points/games;
  const expected=player.ovr/120;
  if(ppg>=expected+0.2){reasons.push({text:"Превышает ожидания роли",value:8});return 8;}
  if(ppg<=expected-0.2){reasons.push({text:"Ниже ожиданий роли",value:-8});return -8;}
  reasons.push({text:"Уровень игры соответствует роли",value:0});
  return 0;
};
const ageMotivationScore=(age,reasons)=>{
  if(age<=24){reasons.push({text:"Молодой возраст — мотивация расти в клубе",value:5});return 5;}
  if(age>=34){reasons.push({text:"Возраст снижает мотивацию к долгому контракту",value:-10});return -10;}
  if(age>=30){reasons.push({text:"Возраст снижает мотивацию к долгому контракту",value:-5});return -5;}
  reasons.push({text:"Возраст нейтрален",value:0});
  return 0;
};
const salarySatisfactionScore=(offerSalary,marketSalary,reasons)=>{
  const delta=offerSalary/marketSalary;
  let score=0;
  if(delta>=1.15)score=20;
  else if(delta>=1.0)score=10;
  else if(delta>=0.9)score=0;
  else if(delta>=0.8)score=-10;
  else score=-20;
  const text=`Соотношение зарплаты к рынку: ${delta.toFixed(2)}`;
  reasons.push({text,value:score});
  return score;
};
const willingnessState=w=>{
  if(w>=75)return {label:"Хочет продлевать",emoji:"🟢",chance:clamp(Math.round(w*0.9),55,95)};
  if(w>=45)return {label:"Сомневается",emoji:"🟡",chance:clamp(Math.round(w*0.7),25,85)};
  return {label:"Не хочет",emoji:"🔴",chance:clamp(Math.round(w*0.5),5,60)};
};
export class ContractService{
  #contracts;#baseContracts;#baseContractIds;
  constructor(contracts){
    this.#baseContracts=(contracts||[]).map(normalizeContract).filter(Boolean);
    this.#baseContractIds=new Set(this.#baseContracts.map(c=>c.id));
    this.#contracts=this.#baseContracts.map(c=>({...c}));
  }
  importContracts(contracts){
    const saved=(contracts||[]).map(normalizeContract).filter(Boolean);
    if(!saved.length){this.#contracts=this.#baseContracts.map(c=>({...c}));return;}
    const merged=new Map(this.#baseContracts.map(c=>[c.id,c]));
    saved.forEach(c=>{
      const base=merged.get(c.id);
      if(base){
        merged.set(c.id,{
          ...base,
          ...c,
          playerId:base.playerId,
          teamId:base.teamId,
          season:base.season
        });
      }else{
        merged.set(c.id,c);
      }
    });
    this.#contracts=[...merged.values()];
  }
  exportContracts(){return this.#contracts.map(c=>({...c}))}
  isRenewalLocked(playerId){
    return this.#contracts.some(c=>c.playerId===playerId && !this.#baseContractIds.has(c.id));
  }
  getRenewalLockReason(playerId){
    if(!this.isRenewalLocked(playerId))return null;
    return "Контракт уже продлен в этом сезоне";
  }
  getContractsForPlayer(playerId){
    return this.#contracts
      .filter(c=>c.playerId===playerId)
      .sort((a,b)=>parseSeasonEnd(a.season)-parseSeasonEnd(b.season));
  }
  getTeamContractRows(team){
    return team.getRoster().map(player=>{
      const playerId=player.id||null;
      if(!playerId){
        return {
          playerId:null,displayName:player.name,age:calculateAge(player.identity.birthDate),ovr:player.ovr,
          position:player.identity?.primaryPosition||"",
          khlGamesPlayed:player.career?.khlGamesPlayed||0,
          seasonStats:{games:player.seasonStats.games,goals:player.seasonStats.goals,assists:player.seasonStats.assists},
          contractEndDate:null,contracts:[]
        };
      }
      let contracts=this.getContractsForPlayer(playerId);
      if(!contracts.length&&player.affiliation.contractId){
        const linked=this.#contracts.find(c=>c.id===player.affiliation.contractId);
        if(linked){
          contracts=linked.playerId?this.getContractsForPlayer(linked.playerId):[linked];
          if(!contracts.length)contracts=[linked];
        }
      }
      const lastContract=contracts.reduce((latest,current)=>{
        if(!latest)return current;
        return parseSeasonEnd(current.season)>=parseSeasonEnd(latest.season)?current:latest;
      },null);
      const isRenewalLocked=this.isRenewalLocked(playerId);
      return {
        playerId,displayName:player.name,age:calculateAge(player.identity.birthDate),ovr:player.ovr,
        position:player.identity?.primaryPosition||"",
        khlGamesPlayed:player.career?.khlGamesPlayed||0,
        seasonStats:{games:player.seasonStats.games,goals:player.seasonStats.goals,assists:player.seasonStats.assists},
        contractEndDate:formatContractEndDate(lastContract?.season),contracts,
        isRenewalLocked,renewalLockReason:isRenewalLocked?this.getRenewalLockReason(playerId):null
      };
    }).sort((a,b)=>a.displayName.localeCompare(b.displayName,"ru"));
  }
  getContractTypeLabel(type){return contractTypeLabel[normalizeType(type)]}
  getRenewalPreview(team,player,offer){
    const contracts=this.getContractsForPlayer(player.id);
    const lastContract=contracts[contracts.length-1]||null;
    const marketSalary=estimateMarketSalary(player,lastContract);
    const years=clamp(offer?.years||1,1,4);
    const offerSalary=offer?.salaryRub||marketSalary;
    const reasons=[];
    let willingness=50;
    willingness+=roleFitScore(player,team,reasons);
    willingness+=teamPerformanceScore(reasons);
    willingness+=personalPerformanceScore(player,reasons);
    willingness+=salarySatisfactionScore(offerSalary,marketSalary,reasons);
    const age=calculateAge(player.identity.birthDate);
    willingness+=ageMotivationScore(age,reasons);
    const ufaStatus=getUfaStatus(age,player.career?.khlGamesPlayed||0);
    if(ufaStatus==="OSA"){
      willingness+=10;
      reasons.push({text:"ОСА — более высокая терпимость",value:10});
      willingness=Math.max(willingness,30);
    }
    willingness=clamp(Math.round(willingness),0,100);
    const state=willingnessState(willingness);
    const isRenewalLocked=this.isRenewalLocked(player.id);
    return {
      playerId:player.id,
      offer:{years,salaryRub:offerSalary},
      marketSalary,
      willingness,
      state,
      ufaStatus,
      reasons,
      isRenewalLocked,
      renewalLockReason:isRenewalLocked?this.getRenewalLockReason(player.id):null
    };
  }
  submitRenewalOffer(team,player,offer){
    const preview=this.getRenewalPreview(team,player,offer);
    if(preview.isRenewalLocked){
      return {decision:"locked",preview};
    }
    const {willingness,ufaStatus}=preview;
    let decision="counter";
    if(ufaStatus==="NSA" && willingness<50)decision="reject";
    else if(willingness>=75)decision="accept";
    if(ufaStatus==="OSA" && decision==="reject")decision="counter";
    if(decision==="accept"){
      const contracts=this.getContractsForPlayer(player.id);
      const lastContract=contracts[contracts.length-1];
      if(!lastContract)return {decision:"reject",preview};
      let season=lastContract.season;
      const newContracts=[];
      for(let i=0;i<preview.offer.years;i++){
        season=formatNextSeason(season);
        const nextContract={
          id:generateUuid(),
          playerId:player.id,
          teamId:player.affiliation.teamId,
          season,
          salaryRub:preview.offer.salaryRub,
          type:lastContract.type
        };
        this.#contracts.push(nextContract);
        newContracts.push(nextContract);
        player.affiliation.contractId=nextContract.id;
      }
      return {decision:"accept",preview,newContracts};
    }
    const counter={
      years:clamp(preview.offer.years,1,4),
      salaryRub:Math.round(preview.marketSalary*1.05)
    };
    return {decision,preview,counter};
  }
  extendContract(player,mode){
    const playerId=player.id;
    if(this.isRenewalLocked(playerId))return null;
    const contracts=this.getContractsForPlayer(playerId);const lastContract=contracts[contracts.length-1];if(!lastContract)return null;
    const nextContract={
      id:generateUuid(),playerId,teamId:player.affiliation.teamId,season:formatNextSeason(lastContract.season),
      salaryRub:Math.round(lastContract.salaryRub*(mode==="raise"?1.1:1)),type:lastContract.type
    };
    this.#contracts.push(nextContract);player.affiliation.contractId=nextContract.id;return nextContract;
  }
}
