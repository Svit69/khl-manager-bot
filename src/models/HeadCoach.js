import { buildCoachExperience, getCoachExperienceScore, recordCoachSeasonExperience } from "../coaches/CoachExperience.js";

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export class HeadCoach {
  constructor(profile) {
    this.id = profile.id;this.teamId = profile.teamId || null;this.firstName = profile.firstName;this.lastName = profile.lastName;
    this.photoUrl = profile.photoUrl || "./player-photo/default.png";this.birthDate = profile.birthDate;this.nationality = profile.nationality;
    this.seasonsCoached = Number(profile.seasonsCoached) || 0;this.khlGamesCoached = Number(profile.khlGamesCoached) || 0;
    this.style = profile.style;this.ratings = { ...profile.ratings };this.experience = buildCoachExperience(profile.experience || profile);
    this.ambition = Number(profile.ambition) || clamp(Math.round(55 + Math.max(0, this.overall - 70) * 1.15 + this.experienceScore * 1.8), 45, 95);
    this.contractUntil = profile.contractUntil || null;
  }

  get name() { return `${this.firstName} ${this.lastName}`; }
  get baseOverall() {
    const values = Object.values(this.ratings).map((value) => Number(value) || 0);
    return Math.round(values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length));
  }
  get experienceScore() { return getCoachExperienceScore(this.experience); }
  get overall() { return clamp(Math.round(this.baseOverall + this.experienceScore), 45, 99); }
  get age() {
    const date = new Date(this.birthDate), now = new Date();
    if (Number.isNaN(date.getTime())) return null;
    const age = now.getUTCFullYear() - date.getUTCFullYear();
    const beforeBirthday = now.getUTCMonth() < date.getUTCMonth() || (now.getUTCMonth() === date.getUTCMonth() && now.getUTCDate() < date.getUTCDate());
    return beforeBirthday ? age - 1 : age;
  }
  assignToTeam(teamId, contractUntil) { this.teamId = teamId || null;this.contractUntil = contractUntil || null; }
  releaseToMarket(context = {}) { this.recordSeasonExperience(context);this.assignToTeam(null, null, 0); }
  extendContractUntil(contractUntil) { if (contractUntil) this.contractUntil = contractUntil; }
  adjustRatings(delta) { Object.keys(this.ratings).forEach((key) => { this.ratings[key] = clamp(Math.round((this.ratings[key] || 65) + delta), 45, 99); }); }
  addSeasonExperience(games, context = {}) { return this.recordSeasonExperience({ ...context, games }); }
  recordSeasonExperience(context = {}) {
    const result = recordCoachSeasonExperience(this.experience, context);
    this.seasonsCoached = Math.max(this.seasonsCoached, Number(this.experience.leagueSeasons) || 0);
    this.khlGamesCoached += result.gamesDelta;
    return result;
  }
  exportSnapshot() { return {
    id: this.id, teamId: this.teamId, firstName: this.firstName, lastName: this.lastName, photoUrl: this.photoUrl,
    birthDate: this.birthDate, nationality: this.nationality, seasonsCoached: this.seasonsCoached, khlGamesCoached: this.khlGamesCoached,
    style: this.style, ratings: { ...this.ratings }, experience: { ...this.experience, seasonLog: [...(this.experience.seasonLog || [])] },
    ambition: this.ambition, contractUntil: this.contractUntil,
  }; }
  static fromSnapshot(snapshot) { return new HeadCoach(snapshot); }
}
