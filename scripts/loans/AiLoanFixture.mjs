import { PlayerPosition as P } from '../../src/models/PlayerPosition.js';
export { P };
export const makeTeam = (id, rating, counts = [5, 5, 4, 8, 3]) => {
  const roster = Object.values(P).flatMap((position, index) =>
    Array.from({ length: counts[index] }, (_, i) => ({ id: `${id}-${index}-${i}`, ovr: rating,
      identity: { primaryPosition: position, birthDate: '1990-06-01' } })));
  return { id, lines: [], getRoster: () => roster };
};
export const fixture = (position = P.CTR) => {
  const owner = makeTeam('owner', 80), borrower = makeTeam('borrower', 65);
  const player = owner.getRoster().filter((entry) => entry.identity.primaryPosition === position).at(-1);
  player.ovr = 70;
  player.identity.birthDate = '2004-06-01';
  const options = { teams: [owner, borrower], activeTeamId: 'elsewhere', seasonLabel: '2026/2027',
    currentDate: '2026-06-20', agreements: [], pending: [], planState: null,
    canLoan: () => true, salaryOf: () => 1000000, random: () => 0 };
  return { owner, borrower, player, options };
};
