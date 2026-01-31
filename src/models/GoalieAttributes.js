export class GoalieAttributes{
  #reflexes;#positioning;#glove;#blocker;#reboundControl;
  constructor({reflexes,positioning,glove,blocker,reboundControl}){
    this.#reflexes=reflexes;this.#positioning=positioning;this.#glove=glove;this.#blocker=blocker;this.#reboundControl=reboundControl;
  }
  toJson(){return {reflexes:this.#reflexes,positioning:this.#positioning,glove:this.#glove,blocker:this.#blocker,reboundControl:this.#reboundControl}}
}
