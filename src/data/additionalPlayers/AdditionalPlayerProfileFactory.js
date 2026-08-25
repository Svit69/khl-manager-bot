import {
  additionalPlayerNationalityByLabel,
  additionalPlayerPositionByLabel,
  additionalPlayerTeamIds,
} from "./additionalPlayerConstants.js";

const createBirthDate = (shortDate) => {
  const [day, month, year] = String(shortDate).split(".");
  const fullYear = Number(year) <= 30 ? `20${year}` : `19${year}`;
  return `${fullYear}-${month}-${day}`;
};

const resolvePositions = (positionLabel) => String(positionLabel)
  .split(",")
  .map((label) => additionalPlayerPositionByLabel[label.trim()])
  .filter(Boolean);

export const createAdditionalPlayerProfile = (record) => {
  const positions = resolvePositions(record.position);
  const primaryPosition = positions[0];
  return {
    id: `added-player-${record.photo}`,
    teamId: additionalPlayerTeamIds[record.team],
    lineIndex: null,
    position: primaryPosition,
    identity: {
      firstName: record.firstName,
      lastName: record.lastName,
      displayName: `${record.firstName} ${record.lastName}`,
      birthDate: createBirthDate(record.birthDate),
      nationality: additionalPlayerNationalityByLabel[record.nationality] || "RU",
      isGoalie: false,
      photoUrl: `./player-photo/${record.photo}.png`,
      primaryPosition,
      secondaryPositions: positions.slice(1),
    },
    attributes: { shot: record.shot, speed: record.speed, physical: record.physical, defense: record.defense, skill: record.skill },
    potential: { potential: record.potential, growthRate: 0.35, peakAge: 28, declineRate: 0.35 },
    condition: { fatigueScore: 0, form: 1.0, injuryUntilDay: null },
    career: { khlGamesPlayed: record.khlGamesPlayed, seasonsPlayed: record.seasonsPlayed, reputation: record.reputation },
    affiliation: { contractId: `added-contract-${record.photo}-2025` },
  };
};
