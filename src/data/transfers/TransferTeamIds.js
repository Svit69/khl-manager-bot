export const buildTeamIdByShortName = (teams = []) =>
  new Map((teams || []).map((team) => [team.shortName, team.id]));

export const resolveTransferTeamId = (teamIdByShortName, shortName) =>
  shortName ? teamIdByShortName.get(shortName) || null : null;
