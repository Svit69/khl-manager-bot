export class PlayerIdentity{
  #id;#firstName;#lastName;#displayName;#birthDate;#nationality;#isGoalie;#photoUrl;#primaryPosition;#secondaryPositions;
  constructor({id,firstName,lastName,displayName,birthDate,nationality,isGoalie,photoUrl=null,primaryPosition,secondaryPositions=[]}){
    this.#id=id;this.#firstName=firstName;this.#lastName=lastName;this.#displayName=displayName;
    this.#birthDate=birthDate;this.#nationality=nationality;this.#isGoalie=isGoalie;this.#photoUrl=photoUrl;
    this.#primaryPosition=primaryPosition;this.#secondaryPositions=secondaryPositions;
  }
  get id(){return this.#id}
  get firstName(){return this.#firstName}
  get lastName(){return this.#lastName}
  get displayName(){return this.#displayName}
  get birthDate(){return this.#birthDate}
  get nationality(){return this.#nationality}
  get isGoalie(){return this.#isGoalie}
  get photoUrl(){return this.#photoUrl}
  set photoUrl(value){this.#photoUrl=value||null}
  get primaryPosition(){return this.#primaryPosition}
  get secondaryPositions(){return this.#secondaryPositions}
  set secondaryPositions(value){this.#secondaryPositions=Array.isArray(value)?value:[]}
  importSnapshot(snapshot={}){
    if("firstName" in snapshot)this.#firstName=snapshot.firstName||this.#firstName;
    if("lastName" in snapshot)this.#lastName=snapshot.lastName||this.#lastName;
    if("displayName" in snapshot)this.#displayName=snapshot.displayName||[this.#firstName,this.#lastName].filter(Boolean).join(" ");
    if("birthDate" in snapshot)this.#birthDate=snapshot.birthDate||this.#birthDate;
    if("nationality" in snapshot)this.#nationality=snapshot.nationality||this.#nationality;
    if("isGoalie" in snapshot)this.#isGoalie=Boolean(snapshot.isGoalie);
    if("photoUrl" in snapshot)this.#photoUrl=snapshot.photoUrl||this.#photoUrl;
    if("primaryPosition" in snapshot)this.#primaryPosition=snapshot.primaryPosition||this.#primaryPosition;
    if("secondaryPositions" in snapshot)this.secondaryPositions=snapshot.secondaryPositions;
  }
}
