export class ExternalTransferFactory {
  createExternalCareer(record, rightsTeamId) {
    const contractUntil = record.contractUntil || null;
    const endYear = Number(String(contractUntil).split("/").pop()) || null;
    return {
      league: record.league || "NHL",
      status: record.statusLabel || "nhl_depth",
      contractUntil,
      contractEndDate: endYear ? `${endYear}-05-31` : null,
      rightsTeamId,
      nhlAmbition: record.league === "AHL" ? 58 : 88,
      returnPreference: record.league === "AHL" ? 64 : 28,
      seasonsOutsideKhl: 1,
      returnInterest: record.league === "AHL" ? 38 : 12,
      availableToKhl: false,
      lastEvaluatedSeason: null,
    };
  }
}
