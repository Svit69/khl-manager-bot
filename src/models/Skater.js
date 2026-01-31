import { Player } from "./Player.js";
export class Skater extends Player{
  #position;
  constructor(identity,attributes,potential,condition,career,affiliation,seasonStats,position){
    super(identity,attributes,potential,condition,career,affiliation,seasonStats);
    this.#position=position;
  }
  get position(){return this.#position}
  getEfficiency(){return super.getEfficiency()*(this.position==="C"?1.04:1)}
}
