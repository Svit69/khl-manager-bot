import { Player } from "./Player.js";
export class Skater extends Player{
  #position;
  constructor(name,attrs,position){super(name,attrs);this.#position=position}
  get position(){return this.#position}
  getEfficiency(){return super.getEfficiency()*(this.position==="C"?1.04:1)}
}
