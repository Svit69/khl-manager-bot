import { generateUuid } from "../utils/uuid.js";
import { ContractType, contractTypeLabel } from "./ContractType.js";
import { createContractNormalizer } from "./ContractNormalization.js";
import { evaluateRenewalWillingness } from "./RenewalScoring.js";
import { calculateAge, clamp, formatContractEndDate, formatNextSeason, parseSeasonEnd } from "./SeasonUtils.js";
const { normalizeType, normalizeContract }=createContractNormalizer(ContractType);
const getLatestContract=contracts=>contracts.reduce((latest,current)=>{
  if(!latest)return current;
  return parseSeasonEnd(current.season)>=parseSeasonEnd(latest.season)?current:latest;
},null);
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
      const contracts=this.#resolvePlayerContracts(playerId,player.affiliation.contractId);
      const lastContract=getLatestContract(contracts);
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
  getRenewalPreview(team,player,offer,context=null){
    const contracts=this.getContractsForPlayer(player.id);
    const lastContract=contracts[contracts.length-1]||null;
    const evaluation=evaluateRenewalWillingness({player,team,offer,context,lastContract});
    const isRenewalLocked=this.isRenewalLocked(player.id);
    return {
      playerId:player.id,
      ...evaluation,
      isRenewalLocked,
      renewalLockReason:isRenewalLocked?this.getRenewalLockReason(player.id):null
    };
  }
  submitRenewalOffer(team,player,offer,context=null){
    const preview=this.getRenewalPreview(team,player,offer,context);
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
    const contracts=this.getContractsForPlayer(playerId);
    const lastContract=contracts[contracts.length-1];
    if(!lastContract)return null;
    const nextContract={
      id:generateUuid(),
      playerId,
      teamId:player.affiliation.teamId,
      season:formatNextSeason(lastContract.season),
      salaryRub:Math.round(lastContract.salaryRub*(mode==="raise"?1.1:1)),
      type:lastContract.type
    };
    this.#contracts.push(nextContract);
    player.affiliation.contractId=nextContract.id;
    return nextContract;
  }
  #resolvePlayerContracts(playerId,linkedContractId){
    let contracts=this.getContractsForPlayer(playerId);
    if(contracts.length||!linkedContractId)return contracts;
    const linked=this.#contracts.find(c=>c.id===linkedContractId);
    if(!linked)return contracts;
    contracts=linked.playerId?this.getContractsForPlayer(linked.playerId):[linked];
    if(!contracts.length)contracts=[linked];
    return contracts;
  }
}
