import { existsSync } from 'node:fs';
import { teamsData } from '../../src/data/teams.js';
import { scoutingRecords } from './scouting/index.mjs';

const typeByLabel = { 'Односторонний': 'one-way', 'Двухсторонний': 'two-way', 'Трехсторонний': 'three-way' };
export class ContractImportPlanner {
  #baseline; #seasons;
  constructor(baseline, seasons) { this.#baseline = baseline; this.#seasons = seasons; }
  createPlan(rows) {
    const contracts = [], transfers = [], players = [];
    for (const row of rows) {
      const previous = row['ID игрока'] ? this.#baseline.find(old => old['ID игрока'] === row['ID игрока'])
        : this.#baseline.find(old => old['Игрок'] === row['Игрок']);
      const team = teamsData.find(team => team.name === row['Команда / группа']);
      const playerId = row['ID игрока'] || previous?.['ID игрока'];
      if (!playerId) throw new Error(`Missing player ID: ${row['Игрок']}`);
      if (!previous) players.push(this.#createPlayer(row, team, playerId));
      const salaryChanged = this.#seasons.some(season => (row[season] || '') !== (previous?.[season] || ''));
      const changed = !previous || salaryChanged || row['Тип контракта'] !== previous['Тип контракта'] || row['Команда / группа'] !== previous['Команда / группа'];
      if (changed) {
        const salaries = team ? this.#seasons.filter(season => Number(String(row[season]).replace(',', '.')) > 0)
          .map(season => [season, Number(String(row[season]).replace(',', '.'))]) : [];
        const type = typeByLabel[row['Тип контракта']];
        if (salaries.length && !type) throw new Error(`Invalid contract type: ${row['Игрок']}`);
        contracts.push({ playerId, team: team?.shortName || null, type: type || 'one-way', salaries });
      }
      if (previous && row['Команда / группа'] !== previous['Команда / группа']) {
        if (!team && row['Команда / группа'] !== 'Свободные агенты') throw new Error(`Unknown destination: ${row['Игрок']}`);
        transfers.push({ playerId, status: team ? 'active' : 'freeAgent', ...(team ? { to: team.shortName } : {}) });
      }
    }
    return { contracts, transfers, players };
  }
  #createPlayer(row, team, id) {
    const scout = scoutingRecords.find(record => record.name === row['Игрок']);
    if (!scout || !team) throw new Error(`Missing scouting record or team: ${row['Игрок']}`);
    const name = scout.slug === 'garrett-pilon' ? 'Гарретт Пилон' : row['Игрок'];
    const [firstName, ...lastName] = name.split(' ');
    const photoSlug = scout.slug === 'dmitri-yudin' ? 'yudin' : scout.slug;
    const photoUrl = existsSync(`player-photo/${photoSlug}.png`) ? `./player-photo/${photoSlug}.png` : './player-photo/default.png';
    return { id, team: team.name, firstName, lastName: lastName.join(' '), birthDate: scout.birthDate,
      positions: scout.positions, nationality: scout.nationality, attributes: scout.attributes, potential: scout.potential,
      seasonsPlayed: scout.seasonsPlayed, khlGamesPlayed: scout.khlGamesPlayed, photoUrl,
      firstContractSeason: this.#seasons.find(season => Number(row[season]) > 0) };
  }
}
