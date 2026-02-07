import { generateUuid } from "../utils/uuid.js";
import { ContractType, contractTypeLabel } from "./ContractType.js";
const parseSeasonStart=season=>Number((season||"0/0").split("/")[0])||0;
const formatNextSeason=season=>{const start=parseSeasonStart(season);return `${start+1}/${start+2}`;};
const formatContractEndDate=season=>{const endYear=Number((season||"0/0").split("/")[1])||0;return endYear?`31.05.${endYear}`:null;};
const calculateAge=birthDate=>{
  const now=new Date(),birth=new Date(birthDate);let age=now.getUTCFullYear()-birth.getUTCFullYear();
  const hasBirthdayPassed=(now.getUTCMonth()>birth.getUTCMonth())||(now.getUTCMonth()===birth.getUTCMonth()&&now.getUTCDate()>=birth.getUTCDate());
  return hasBirthdayPassed?age:age-1;
};
const normalizeType=type=>Object.values(ContractType).includes(type)?type:ContractType.ONE_WAY;
const normalizeContract=contract=>({...contract,type:normalizeType(contract.type)});
export class ContractService{
  #contracts;#baseContracts;
  constructor(contracts){
    this.#baseContracts=(contracts||[]).map(normalizeContract);
    this.#contracts=this.#baseContracts.map(c=>({...c}));
  }
  importContracts(contracts){
    const saved=(contracts||[]).map(normalizeContract);
    if(!saved.length){this.#contracts=this.#baseContracts.map(c=>({...c}));return;}
    const merged=new Map(this.#baseContracts.map(c=>[c.id,c]));
    saved.forEach(c=>merged.set(c.id,c));
    this.#contracts=[...merged.values()];
  }
  exportContracts(){return this.#contracts.map(c=>({...c}))}
  getContractsForPlayer(playerId){return this.#contracts.filter(c=>c.playerId===playerId).sort((a,b)=>parseSeasonStart(a.season)-parseSeasonStart(b.season));}
  getTeamContractRows(team){
    return team.getRoster().map(player=>{
      const playerId=player.identity.id;
      let contracts=this.getContractsForPlayer(playerId);
      if(!contracts.length&&player.affiliation.contractId){
        const linked=this.#contracts.find(c=>c.id===player.affiliation.contractId);
        if(linked)contracts=this.getContractsForPlayer(linked.playerId);
      }
      const lastContract=contracts[contracts.length-1]||null;
      return {
        playerId,displayName:player.name,age:calculateAge(player.identity.birthDate),ovr:player.ovr,
        seasonStats:{games:player.seasonStats.games,goals:player.seasonStats.goals,assists:player.seasonStats.assists},
        contractEndDate:formatContractEndDate(lastContract?.season),contracts
      };
    }).sort((a,b)=>a.displayName.localeCompare(b.displayName,"ru"));
  }
  getContractTypeLabel(type){return contractTypeLabel[normalizeType(type)]}
  extendContract(player,mode){
    const contracts=this.getContractsForPlayer(player.identity.id);const lastContract=contracts[contracts.length-1];if(!lastContract)return null;
    const nextContract={
      id:generateUuid(),playerId:player.identity.id,teamId:player.affiliation.teamId,season:formatNextSeason(lastContract.season),
      salaryRub:Math.round(lastContract.salaryRub*(mode==="raise"?1.1:1)),type:lastContract.type
    };
    this.#contracts.push(nextContract);player.affiliation.contractId=nextContract.id;return nextContract;
  }
}
