import { teamsData } from '../teams.js';

export class ImportedPlayerProfileFactory {
  createProfile(record) {
    const goalie = record.positions[0] === 'ВРТ';
    const keys = goalie ? ['reaction', 'positioning', 'athleticism', 'puckControl', 'mental']
      : ['shot', 'speed', 'physical', 'defense', 'skill'];
    const birthYear = Number(record.birthDate.slice(0, 4));
    return {
      id: record.id, teamId: teamsData.find(team => team.name === record.team)?.id,
      lineIndex: null, position: record.positions[0],
      identity: { firstName: record.firstName, lastName: record.lastName,
        displayName: `${record.firstName} ${record.lastName}`, birthDate: record.birthDate,
        nationality: record.nationality, isGoalie: goalie, photoUrl: record.photoUrl,
        primaryPosition: record.positions[0], secondaryPositions: record.positions.slice(1) },
      attributes: Object.fromEntries(keys.map((key, index) => [key, record.attributes[index]])),
      potential: { potential: record.potential, growthRate: birthYear >= 2002 ? 0.7 : 0.35,
        peakAge: goalie ? 29 : 27, declineRate: 0.5 },
      condition: { fatigueScore: 0, form: 1, injuryUntilDay: null },
      career: { seasonsPlayed: record.seasonsPlayed, khlGamesPlayed: record.khlGamesPlayed, reputation: 100 },
      affiliation: { contractId: `import-contract-${record.id}-${record.firstContractSeason.slice(0, 4)}` },
    };
  }
}
