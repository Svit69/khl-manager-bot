import { generateUuid } from "../utils/uuid.js";
const parseSeasonStart=season=>Number((season||"0/0").split("/")[0])||0;
const formatNextSeason=season=>{
  const start=parseSeasonStart(season);
  return `${start+1}/${start+2}`;
};
const calculateAge=birthDate=>{
  const now=new Date();
  const birth=new Date(birthDate);
  let age=now.getUTCFullYear()-birth.getUTCFullYear();
  const hasBirthdayPassed=(now.getUTCMonth()>birth.getUTCMonth())||
    (now.getUTCMonth()===birth.getUTCMonth()&&now.getUTCDate()>=birth.getUTCDate());
  return hasBirthdayPassed?age:age-1;
};
export class ContractService{
  #contracts;
  constructor(contracts){this.#contracts=(contracts||[]).map(c=>({...c}))}
  importContracts(contracts){this.#contracts=(contracts||[]).map(c=>({...c}))}
  exportContracts(){return this.#contracts.map(c=>({...c}))}
  getContractsForPlayer(playerId){
    return this.#contracts.filter(c=>c.playerId===playerId).sort((a,b)=>parseSeasonStart(a.season)-parseSeasonStart(b.season));
  }
  getTeamContractRows(team){
    return team.getRoster().map(player=>{
      const contracts=this.getContractsForPlayer(player.identity.id);
      const lastContract=contracts[contracts.length-1]||null;
      return {
        playerId:player.identity.id,
        displayName:player.name,
        age:calculateAge(player.identity.birthDate),
        ovr:player.ovr,
        seasonStats:{games:player.seasonStats.games,goals:player.seasonStats.goals,assists:player.seasonStats.assists},
        contractEndSeason:lastContract?.season||"—",
        contracts
      };
    }).sort((a,b)=>a.displayName.localeCompare(b.displayName,"ru"));
  }
  extendContract(player,mode){
    const contracts=this.getContractsForPlayer(player.identity.id);
    const lastContract=contracts[contracts.length-1];
    if(!lastContract)return null;
    const salaryMultiplier=mode==="raise"?1.1:1;
    const nextContract={
      id:generateUuid(),
      playerId:player.identity.id,
      teamId:player.affiliation.teamId,
      season:formatNextSeason(lastContract.season),
      salaryRub:Math.round(lastContract.salaryRub*salaryMultiplier)
    };
    this.#contracts.push(nextContract);
    player.affiliation.contractId=nextContract.id;
    return nextContract;
  }
}
