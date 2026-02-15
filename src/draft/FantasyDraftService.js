import { calculateAge } from "../contracts/SeasonUtils.js";
const POSITION_ALL="ALL";
const DEFAULT_SORT="ovr";
const compareByOvr=(a,b)=>b.ovr-a.ovr||a.name.localeCompare(b.name,"ru");
const compareByPosition=(a,b)=>{
  const posA=a.identity?.primaryPosition||"",posB=b.identity?.primaryPosition||"";
  return posA.localeCompare(posB,"ru")||compareByOvr(a,b);
};
const compareByAge=(a,b)=>calculateAge(a.identity?.birthDate)-calculateAge(b.identity?.birthDate)||compareByOvr(a,b);
export class FantasyDraftService{
  #teams;#rounds;#userTeamId;#availablePlayers;#pickedByTeamId=new Map();#pickLog=[];#pickIndex=0;
  constructor(teams,players,userTeamId,rounds=20){
    this.#teams=[...teams];
    this.#rounds=rounds;
    this.#userTeamId=userTeamId;
    this.#availablePlayers=[...players];
    this.#teams.forEach(team=>this.#pickedByTeamId.set(team.id,[]));
  }
  get isComplete(){
    return this.#pickIndex>=this.#rounds*this.#teams.length||this.#availablePlayers.length===0;
  }
  getCurrentTeam(){
    if(this.isComplete)return null;
    const teamCount=this.#teams.length;
    const round=Math.floor(this.#pickIndex/teamCount)+1;
    const indexInRound=this.#pickIndex%teamCount;
    const forward=(round%2)===1;
    const teamIndex=forward?indexInRound:(teamCount-1-indexInRound);
    return this.#teams[teamIndex]||null;
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
    const filtered=this.#availablePlayers.filter(player=>{
      if(filterPosition===POSITION_ALL)return true;
      return (player.identity?.primaryPosition||"")===filterPosition;
    });
    const sorted=[...filtered].sort(sortBy==="position"?compareByPosition:(sortBy==="age"?compareByAge:compareByOvr));
    const currentTeam=this.getCurrentTeam();
    return {
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
      pickLog:[...this.#pickLog]
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
    this.#pickLog.push({pickNumber:this.#pickIndex+1,round:Math.floor(this.#pickIndex/this.#teams.length)+1,teamId:team.id,teamName:team.name,playerName:player.name});
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
}
