import { createTeams } from '../../src/data/seed.js';
import { createFreeAgents } from '../../src/data/freeAgents.js';
import { createExternalPlayers } from '../../src/data/externalPlayers.js';
import { teamsData } from '../../src/data/teams.js';
import { playerContracts } from '../../src/data/contracts.js';
import { transferUpdateRecords } from '../../src/data/transfers/TransferUpdateRecords.js';
import { TransferUpdateService } from '../../src/data/transfers/TransferUpdateService.js';

export class ContractReportBuilder {
  #contracts = structuredClone(playerContracts);
  buildReport() {
    const teams = createTeams(teamsData);
    const freeAgents = createFreeAgents();
    const externalPlayers = createExternalPlayers();
    new TransferUpdateService(transferUpdateRecords).applyTransferUpdates({ teams, freeAgents, externalPlayers, contracts: this.#contracts });
    const seasons = [...new Set(this.#contracts.map(contract => contract.season))].sort();
    const entries = teams.flatMap(team => team.getRoster().map(player => ({ player, club: team.name, active: true })));
    entries.push(...freeAgents.map(player => ({ player, club: 'Свободные агенты' })));
    entries.push(...externalPlayers.map(player => ({ player, club: 'Права КХЛ / НХЛ / АХЛ' })));
    const ids = entries.map(entry => entry.player.id);
    if (new Set(ids).size !== ids.length) throw new Error('Duplicate players in contract report');
    const rows = entries.sort((a, b) => a.club.localeCompare(b.club, 'ru') || a.player.name.localeCompare(b.player.name, 'ru'))
      .map(entry => this.#createRow(entry, seasons));
    return { seasons, rows, headers: ['Команда / группа', 'Игрок', 'Позиция', 'Гражданство', 'ОБЩ', 'Сезонов КХЛ', 'Матчей КХЛ', 'Тип контракта', ...seasons, 'Права КХЛ', 'Внешняя лига / статус', 'Внешний контракт до', 'ID игрока'] };
  }
  #createRow({ player, club, active }, seasons) {
    const contracts = active ? this.#contracts.filter(contract => contract.playerId === player.id).sort((a, b) => a.season.localeCompare(b.season)) : [];
    const types = { 'one-way': 'Односторонний', 'two-way': 'Двухсторонний', 'three-way': 'Трехсторонний' };
    const career = player.externalCareer;
    const salaries = seasons.map(season => {
      const contract = contracts.find(item => item.season === season);
      return contract ? String(contract.salaryRub / 1e6).replace('.', ',') : '';
    });
    const contractTypes = [...new Set(contracts.map(contract => types[contract.type] || contract.type))].join(' / ');
    return [club, player.name, player.identity.primaryPosition,
      player.identity.nationality, player.ovr, player.career.seasonsPlayed, player.career.khlGamesPlayed,
      contractTypes || 'Нет контракта КХЛ', ...salaries,
      teamsData.find(team => team.id === career?.rightsTeamId)?.name || '',
      career ? `${career.league || ''} / ${career.status || ''}` : '', career?.contractUntil || '', player.id];
  }
}
