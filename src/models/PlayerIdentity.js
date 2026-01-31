export class PlayerIdentity{
  #id;#firstName;#lastName;#displayName;#birthDate;#nationality;#isGoalie;#photoUrl;
  constructor({id,firstName,lastName,displayName,birthDate,nationality,isGoalie,photoUrl=null}){
    this.#id=id;this.#firstName=firstName;this.#lastName=lastName;this.#displayName=displayName;
    this.#birthDate=birthDate;this.#nationality=nationality;this.#isGoalie=isGoalie;this.#photoUrl=photoUrl;
  }
  get id(){return this.#id}
  get firstName(){return this.#firstName}
  get lastName(){return this.#lastName}
  get displayName(){return this.#displayName}
  get birthDate(){return this.#birthDate}
  get nationality(){return this.#nationality}
  get isGoalie(){return this.#isGoalie}
  get photoUrl(){return this.#photoUrl}
}
