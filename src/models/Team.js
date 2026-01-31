export class Team{
  #name;#lines;
  constructor(name,lines){this.#name=name;this.#lines=lines}
  get name(){return this.#name}
  get lines(){return this.#lines}
  getStrength(){return this.#lines.reduce((a,l)=>a+l.getStrength(),0)}
  getRoster(){return this.#lines.flatMap(l=>l.players)}
}
