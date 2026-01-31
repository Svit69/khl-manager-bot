export class Team{
  #id;#name;#shortName;#city;#country;#logoUrl;#isPlayable;#createdAt;#lines;
  constructor(info,lines){
    this.#id=info.id;this.#name=info.name;this.#shortName=info.shortName;this.#city=info.city;
    this.#country=info.country;this.#logoUrl=info.logoUrl;this.#isPlayable=info.isPlayable;
    this.#createdAt=info.createdAt;this.#lines=lines;
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
  getStrength(){return this.#lines.reduce((a,l)=>a+l.getStrength(),0)}
  getRoster(){return this.#lines.flatMap(l=>l.players)}
}
