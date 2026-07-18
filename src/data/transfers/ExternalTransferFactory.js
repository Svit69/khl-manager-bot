export class ExternalTransferFactory {
  createExternalCareer(record, rightsTeamId) {
    const isRightsOnly = record.status === "rightsOnly";
    const contractUntil = record.contractUntil || null;
    const endYear = Number(String(contractUntil).split("/").pop()) || null;
    return {
      league: record.league || (isRightsOnly ? "Права КХЛ" : "NHL"),
      status: record.statusLabel || (isRightsOnly ? "rights_only" : "nhl_depth"),
      contractUntil,
      contractEndDate: endYear ? `${endYear}-05-31` : null,
      rightsTeamId,
      nhlAmbition: isRightsOnly ? 18 : record.league === "AHL" ? 58 : 88,
      returnPreference: isRightsOnly ? 82 : record.league === "AHL" ? 64 : 28,
      seasonsOutsideKhl: isRightsOnly ? 0 : 1,
      returnInterest: isRightsOnly ? 10 : record.league === "AHL" ? 38 : 12,
      availableToKhl: Boolean(record.availableToKhl),
      lastEvaluatedSeason: null,
    };
  }
}
