import { adjustedOvrForPosition } from "../utils/positionFit.js";
export class Line{
  #players;#weight;#positions;
  constructor(players,weight,positions=[]){this.#players=players;this.#weight=weight;this.#positions=positions}
  get players(){return this.#players}
  get weight(){return this.#weight}
  get positions(){return this.#positions}
  getStrength(){
    if(this.#players.length===0){
      return 0;
    }
    const values=this.#players.map((player,index)=>{
      const adjusted=adjustedOvrForPosition(player,this.#positions[index]);
      const ratio=player.ovr>0?adjusted/player.ovr:1;
      return player.getEfficiency()*ratio;
    });
    return values.reduce((a,b)=>a+b,0)/this.#players.length*this.#weight;
  }
}
