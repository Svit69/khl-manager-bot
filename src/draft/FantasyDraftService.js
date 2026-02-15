import { calculateAge } from "../contracts/SeasonUtils.js";
import { generateUuid } from "../utils/uuid.js";
const POSITION_ALL="ALL";
const DEFAULT_SORT="ovr";
const FLOW_STAGE=Object.freeze({
  CREATED:"Создать/начать драфт",
  ORDER:"Определен порядок",
  PICKS:"Раунды выбора игроков",
  FILLED:"Ростеры заполнены",
  LINES:"Автосбор звеньев",
  SEASON:"Старт сезона"
});
const compareByOvr=(a,b)=>b.ovr-a.ovr||a.name.localeCompare(b.name,"ru");
const compareByPosition=(a,b)=>{
  const posA=a.identity?.primaryPosition||"",posB=b.identity?.primaryPosition||"";
  return posA.localeCompare(posB,"ru")||compareByOvr(a,b);
};
const compareByAge=(a,b)=>calculateAge(a.identity?.birthDate)-calculateAge(b.identity?.birthDate)||compareByOvr(a,b);
export class FantasyDraftService{
  #draftId;#teams;#rounds;#userTeamId;#availablePlayers;#pickedByTeamId=new Map();#pickLog=[];#pickIndex=0;#draftOrder;
  constructor(teams,players,userTeamId,rounds=20){
    this.#draftId=generateUuid();
    this.#teams=[...teams];
    this.#rounds=rounds;
    this.#userTeamId=userTeamId;
    this.#availablePlayers=[...players];
    this.#teams.forEach(team=>this.#pickedByTeamId.set(team.id,[]));
    this.#draftOrder=this.#buildDraftOrder();
  }
  get draftId(){return this.#draftId}
  get isComplete(){
    return this.#pickIndex>=this.#rounds*this.#teams.length||this.#availablePlayers.length===0;
  }
  getCurrentTeam(){
    if(this.isComplete)return null;
    const order=this.#draftOrder[this.#pickIndex];
    return this.#teams.find(team=>team.id===order.teamId)||null;
  }
  isUserTurn(){
    return this.getCurrentTeam()?.id===this.#userTeamId;
  }
  hasAvailablePlayer(playerId){
    return this.#availablePlayers.some(player=>player.id===playerId);
  }
  getUserRosterByPosition(){
    const picked=[...(this.#pickedByTeamId.get(this.#userTeamId)||[])];
    const byPosition={CTR:[],LW:[],RW:[],DEF:[],G:[]};
    picked.forEach(player=>{
      const position=player.identity?.primaryPosition||"";
      if(position==="ЦТР")byPosition.CTR.push(player);
      else if(position==="ЛНП")byPosition.LW.push(player);
      else if(position==="ПНП")byPosition.RW.push(player);
      else if(position==="ЗАЩ")byPosition.DEF.push(player);
      else if(position==="ВРТ")byPosition.G.push(player);
    });
    return byPosition;
  }
  getView(sortBy=DEFAULT_SORT,filterPosition=POSITION_ALL){
    const filtered=this.#availablePlayers.filter(player=>filterPosition===POSITION_ALL || (player.identity?.primaryPosition||"")===filterPosition);
    const sorted=[...filtered].sort(sortBy==="position"?compareByPosition:(sortBy==="age"?compareByAge:compareByOvr));
    const currentTeam=this.getCurrentTeam();
    return {
      draftId:this.#draftId,
      currentTeamId:currentTeam?.id||null,
      currentTeamName:currentTeam?.name||"",
      currentRound:Math.floor(this.#pickIndex/this.#teams.length)+1,
      currentPickInRound:(this.#pickIndex%this.#teams.length)+1,
      pickNumber:this.#pickIndex+1,
      totalPicks:this.#rounds*this.#teams.length,
      isComplete:this.isComplete,
      isUserTurn:this.isUserTurn(),
      sortBy,
      filterPosition,
      availablePlayers:sorted,
      userRosterByPosition:this.getUserRosterByPosition(),
      teams:this.#teams.map(team=>({
        id:team.id,
        name:team.name,
        pickedCount:(this.#pickedByTeamId.get(team.id)||[]).length
      })),
      pickLog:[...this.#pickLog],
      flow:[
        {step:FLOW_STAGE.CREATED,isDone:true,isCurrent:false},
        {step:FLOW_STAGE.ORDER,isDone:true,isCurrent:false},
        {step:FLOW_STAGE.PICKS,isDone:this.isComplete,isCurrent:!this.isComplete},
        {step:FLOW_STAGE.FILLED,isDone:this.isComplete,isCurrent:false},
        {step:FLOW_STAGE.LINES,isDone:false,isCurrent:false},
        {step:FLOW_STAGE.SEASON,isDone:false,isCurrent:false}
      ],
      upcomingOrder:this.#draftOrder.slice(this.#pickIndex,Math.min(this.#pickIndex+8,this.#draftOrder.length))
    };
  }
  pickPlayer(playerId){
    if(this.isComplete)return null;
    const team=this.getCurrentTeam();
    if(!team)return null;
    const playerIndex=this.#availablePlayers.findIndex(player=>player.id===playerId);
    if(playerIndex===-1)return null;
    const player=this.#availablePlayers.splice(playerIndex,1)[0];
    this.#pickedByTeamId.get(team.id).push(player);
    this.#pickLog.push({
      pickNumber:this.#pickIndex+1,
      round:Math.floor(this.#pickIndex/this.#teams.length)+1,
      teamId:team.id,
      teamName:team.name,
      playerName:player.name
    });
    this.#pickIndex++;
    return {team,player};
  }
  autoPickUntilUserTurn(){
    while(!this.isComplete && !this.isUserTurn()){
      const best=[...this.#availablePlayers].sort(compareByOvr)[0];
      if(!best)break;
      this.pickPlayer(best.id);
    }
  }
  getAssignments(){
    const result={};
    this.#teams.forEach(team=>{result[team.id]=[...(this.#pickedByTeamId.get(team.id)||[])];});
    return result;
  }
  #buildDraftOrder(){
    const order=[];
    for(let round=1;round<=this.#rounds;round++){
      const forward=(round%2)===1;
      const teamIds=forward?this.#teams.map(team=>team.id):[...this.#teams.map(team=>team.id)].reverse();
      teamIds.forEach((teamId,index)=>{
        order.push({draftId:this.#draftId,round,pick:index+1,teamId});
      });
    }
    return order;
  }
}

