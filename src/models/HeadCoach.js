export class HeadCoach {
  constructor(profile) {
    this.id = profile.id;
    this.teamId = profile.teamId || null;
    this.firstName = profile.firstName;
    this.lastName = profile.lastName;
    this.photoUrl = profile.photoUrl || "./player-photo/default.png";
    this.birthDate = profile.birthDate;
    this.nationality = profile.nationality;
    this.seasonsCoached = Number(profile.seasonsCoached) || 0;
    this.khlGamesCoached = Number(profile.khlGamesCoached) || 0;
    this.style = profile.style;
    this.contractUntil = profile.contractUntil || null;
    this.ratings = { ...profile.ratings };
  }

  get name() { return `${this.firstName} ${this.lastName}`; }

  get overall() {
    const values = Object.values(this.ratings).map((value) => Number(value) || 0);
    return Math.round(values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length));
  }

  get age() {
    const date = new Date(this.birthDate);
    if (Number.isNaN(date.getTime())) return null;
    const now = new Date();
    let age = now.getUTCFullYear() - date.getUTCFullYear();
    const beforeBirthday = now.getUTCMonth() < date.getUTCMonth() || (now.getUTCMonth() === date.getUTCMonth() && now.getUTCDate() < date.getUTCDate());
    return beforeBirthday ? age - 1 : age;
  }

  assignToTeam(teamId, contractUntil) { this.teamId = teamId || null; this.contractUntil = contractUntil || null; }
  releaseToMarket() { this.assignToTeam(null, null); }
  extendContractUntil(contractUntil) { if (contractUntil) this.contractUntil = contractUntil; }

  exportSnapshot() {
    return {
      id: this.id, teamId: this.teamId, firstName: this.firstName, lastName: this.lastName,
      photoUrl: this.photoUrl, birthDate: this.birthDate, nationality: this.nationality,
      seasonsCoached: this.seasonsCoached, khlGamesCoached: this.khlGamesCoached,
      style: this.style, ratings: { ...this.ratings }, contractUntil: this.contractUntil,
    };
  }

  static fromSnapshot(snapshot) {
    return new HeadCoach(snapshot);
  }
}
