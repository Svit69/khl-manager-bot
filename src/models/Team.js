export class Team{
  #id;#name;#shortName;#city;#country;#logoUrl;#isPlayable;#createdAt;#lines;#reservePlayers;
  constructor(info,lines,reservePlayers=[]){
    this.#id=info.id;this.#name=info.name;this.#shortName=info.shortName;this.#city=info.city;
    this.#country=info.country;this.#logoUrl=info.logoUrl;this.#isPlayable=info.isPlayable;
    this.#createdAt=info.createdAt;this.#lines=lines;this.#reservePlayers=reservePlayers;
  }
  get id(){return this.#id}
  get name(){return this.#name}
  get shortName(){return this.#shortName}
  get city(){return this.#city}
  get country(){return this.#country}
  get logoUrl(){return this.#logoUrl}
  get isPlayable(){return this.#isPlayable}
  get createdAt(){return this.#createdAt}
  get lines(){return this.#lines}
  get reservePlayers(){return this.#reservePlayers}
  getStrength(){return this.#lines.reduce((a,l)=>a+l.getStrength(),0)}
  getRoster(){return [...this.#lines.flatMap(l=>l.players),...this.#reservePlayers]}
}
