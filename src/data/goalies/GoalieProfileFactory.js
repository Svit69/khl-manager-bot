import { PlayerPosition } from "../../models/PlayerPosition.js";
import { readGoalieRecord } from "./GoalieRecordSchema.js";

const photo = (slug) => `./player-photo/${slug}.png`;
export const goaliePlayerId = (slug) => `goalie-player-${slug}`;
export const goalieContractId = (slug, seasonIndex) => `goalie-contract-${slug}-${seasonIndex}`;

const getPeakAge = (birthDate) => {
  const birthYear = Number(String(birthDate).slice(0, 4)) || 1998;
  return birthYear >= 2004 ? 28 : birthYear >= 1999 ? 29 : 31;
};
const getGrowthRate = (birthDate) => {
  const birthYear = Number(String(birthDate).slice(0, 4)) || 1998;
  return birthYear >= 2005 ? 1 : birthYear >= 2001 ? 0.85 : 0.5;
};

export const createGoalieProfile = (row) => {
  const record = readGoalieRecord(row);
  return {
    id: goaliePlayerId(record.slug),
    teamId: record.teamId,
    lineIndex: 5,
    position: PlayerPosition.G,
    identity: {
      firstName: record.firstName,
      lastName: record.lastName,
      displayName: `${record.firstName} ${record.lastName}`,
      birthDate: record.birthDate,
      nationality: record.nationality,
      isGoalie: true,
      photoUrl: photo(record.slug),
      primaryPosition: PlayerPosition.G,
      secondaryPositions: [],
    },
    attributes: { reaction: record.reaction, positioning: record.positioning, athleticism: record.athleticism, puckControl: record.puckControl, mental: record.mental },
    potential: { potential: record.potential, growthRate: getGrowthRate(record.birthDate), peakAge: getPeakAge(record.birthDate), declineRate: 0.7 },
    condition: { fatigueScore: 0, form: 1.0, injuryUntilDay: null },
    career: { khlGamesPlayed: record.khlGamesPlayed, seasonsPlayed: record.seasonsPlayed, reputation: record.reputation },
    affiliation: { contractId: goalieContractId(record.slug, 0) },
  };
};
