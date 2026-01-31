export class SkaterAttributes{
  #shot;#speed;#physical;#defense;#skill;
  constructor({shot,speed,physical,defense,skill}){this.#shot=shot;this.#speed=speed;this.#physical=physical;this.#defense=defense;this.#skill=skill}
  toJson(){return {shot:this.#shot,speed:this.#speed,physical:this.#physical,defense:this.#defense,skill:this.#skill}}
}
