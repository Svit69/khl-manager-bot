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
    this.ratings = { ...profile.ratings };
    this.contractUntil = profile.contractUntil || null;
    this.salaryRub = Number(profile.salaryRub) || Math.round((12 + Math.max(0, this.overall - 62) * 1.45 + Math.min(14, this.khlGamesCoached / 95)) * 1000000);
  }

  get name() { return `${this.firstName} ${this.lastName}`; }
  get overall() {
    const values = Object.values(this.ratings).map((value) => Number(value) || 0);
    return Math.round(values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length));
  }

  get age() {
    const date = new Date(this.birthDate), now = new Date();
    if (Number.isNaN(date.getTime())) return null;
    const age = now.getUTCFullYear() - date.getUTCFullYear();
    const beforeBirthday = now.getUTCMonth() < date.getUTCMonth() || (now.getUTCMonth() === date.getUTCMonth() && now.getUTCDate() < date.getUTCDate());
    return beforeBirthday ? age - 1 : age;
  }
  assignToTeam(teamId, contractUntil, salaryRub = this.salaryRub) { this.teamId = teamId || null; this.contractUntil = contractUntil || null; this.salaryRub = Number(salaryRub) || 0; }
  releaseToMarket() { this.assignToTeam(null, null, 0); }
  extendContractUntil(contractUntil) { if (contractUntil) this.contractUntil = contractUntil; }
  adjustRatings(delta) { Object.keys(this.ratings).forEach((key) => { this.ratings[key] = Math.max(45, Math.min(99, Math.round((this.ratings[key] || 65) + delta))); }); }
  addSeasonExperience(games) { this.seasonsCoached += 1; this.khlGamesCoached += Math.max(0, Number(games) || 0); }

  exportSnapshot() { return {
      id: this.id, teamId: this.teamId, firstName: this.firstName, lastName: this.lastName,
      photoUrl: this.photoUrl, birthDate: this.birthDate, nationality: this.nationality,
      seasonsCoached: this.seasonsCoached, khlGamesCoached: this.khlGamesCoached,
      style: this.style, ratings: { ...this.ratings }, contractUntil: this.contractUntil, salaryRub: this.salaryRub,
  }; }
  static fromSnapshot(snapshot) { return new HeadCoach(snapshot); }
}
