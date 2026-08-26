import { rosterReportCareerUpdateRecords } from "./index.js";

const gamesPlayedByPlayerId = new Map(
  rosterReportCareerUpdateRecords.map((record) => [record.playerId, record.khlGamesPlayed]),
);

export const applyRosterReportCareerUpdates = (profile) => {
  const khlGamesPlayed = gamesPlayedByPlayerId.get(profile?.id);
  if (!Number.isFinite(khlGamesPlayed)) return profile;
  return {
    ...profile,
    career: {
      ...profile.career,
      khlGamesPlayed,
    },
  };
};
