import { rosterExpansionPlayers } from './players/index.js';

export const rosterExpansionTransfers = rosterExpansionPlayers
  .filter(player => player.status === 'freeAgent')
  .map(player => ({ playerId: player.id, status: 'freeAgent' }));
