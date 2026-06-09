export class ExternalRightsProfileBuilder {
  #positionByLabel;#nationalityByLabel;#teamIds;#seasonByEndYear;
  constructor({ positionByLabel, nationalityByLabel, teamIds, seasonByEndYear }) {
    if (new.target === ExternalRightsProfileBuilder) throw new Error("ExternalRightsProfileBuilder is abstract");
    this.#positionByLabel = positionByLabel;this.#nationalityByLabel = nationalityByLabel;
    this.#teamIds = teamIds;this.#seasonByEndYear = seasonByEndYear;
  }
  buildPlayerProfiles(records) { return records.map((record) => this.buildPlayerProfile(record)); }
  buildPlayerProfile(record) {
    const position = this.resolvePosition(record.position);
    return {
      id: this.createPlayerId(record.slug),position,
      identity: {
        firstName: record.firstName,lastName: record.lastName,displayName: `${record.firstName} ${record.lastName}`,
        birthDate: record.birthDate,nationality: this.resolveNationality(record.nationality),isGoalie: false,
        photoUrl: `./player-photo/${record.photoSlug}.png`,primaryPosition: position,
        secondaryPositions: record.secondaryPositions.map((label) => this.resolvePosition(label)).filter(Boolean),
      },
      attributes: { shot: record.shot, speed: record.speed, physical: record.physical, defense: record.defense, skill: record.skill },
      potential: { potential: record.potential, growthRate: this.calculateGrowthRate(record.birthDate), peakAge: this.calculatePeakAge(record.birthDate), declineRate: 0.35 },
      condition: { fatigueScore: 0, form: 1, injuryUntilDay: null },
      career: { khlGamesPlayed: record.khlGamesPlayed, seasonsPlayed: record.seasonsPlayed, reputation: record.reputation },
      affiliation: { teamId: null, contractId: null, acquiredDay: null },
      externalCareer: this.buildExternalCareer(record),
    };
  }
  buildExternalCareer(record) {
    return {
      league: record.league,status: this.resolveStatus(record),contractUntil: this.resolveContractSeason(record.contractEndYear),
      contractEndDate: `${record.contractEndYear}-05-31`,rightsTeamId: this.resolveRightsTeamId(record.rightsTeam),
      nhlAmbition: record.league === "NHL" ? 88 : 58,returnPreference: record.league === "NHL" ? 28 : 64,
      seasonsOutsideKhl: 1,returnInterest: record.league === "NHL" ? 12 : 38,availableToKhl: false,lastEvaluatedSeason: null,
    };
  }
  resolvePosition(label) { return this.#positionByLabel[label]; }
  resolveNationality(label) { return this.#nationalityByLabel[label] || "RU"; }
  resolveRightsTeamId(shortName) { return this.#teamIds[shortName] || null; }
  resolveContractSeason(endYear) { return this.#seasonByEndYear[endYear] || null; }
  resolveStatus(record) { return record.league === "NHL" ? (record.potential >= 84 ? "nhl_regular" : "nhl_depth") : (record.potential >= 80 ? "ahl_leader" : "ahl_bubble"); }
  calculatePeakAge(birthDate) { const year = Number(String(birthDate).slice(0, 4)) || 1998; return year >= 2004 ? 27 : year >= 1999 ? 28 : year >= 1994 ? 29 : 31; }
  calculateGrowthRate(birthDate) { const year = Number(String(birthDate).slice(0, 4)) || 1998; return year >= 2005 ? 1 : year >= 2001 ? 0.75 : 0.45; }
  createPlayerId() { throw new Error("createPlayerId must be implemented"); }
}
