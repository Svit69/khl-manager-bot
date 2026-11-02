import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { teamsData } from '../../src/data/teams.js';
import { RosterExpansionAttributes } from './RosterExpansionAttributes.mjs';
import { RosterExpansionContractPlanner } from './RosterExpansionContractPlanner.mjs';

export const normalizePlayerName = name => String(name).trim().toLowerCase().replaceAll('ё', 'е');
export class RosterExpansionBuilder {
  #attributes = new RosterExpansionAttributes();
  #contracts = new RosterExpansionContractPlanner();
  createPlayerAndContract(request, record) {
    if (!record) throw new Error(`Missing research: ${request.name}`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(record.birthDate || '')) throw new Error(`Missing birth date: ${request.name}`);
    const positions = record.positions;
    if (!positions?.length || positions.some(position => !['ВРТ', 'ЗАЩ', 'ЛНП', 'ЦТР', 'ПНП'].includes(position))) throw new Error(`Invalid positions: ${request.name}`);
    if (!Number.isInteger(record.overall) || record.overall < 40 || record.overall > 90) throw new Error(`Invalid overall: ${request.name}`);
    if (!Number.isInteger(record.potential) || record.potential < record.overall || record.potential > 95) throw new Error(`Invalid potential: ${request.name}`);
    if (!/^[A-Z]{2}$/.test(record.nationality || '')) throw new Error(`Missing nationality: ${request.name}`);
    const team = teamsData.find(team => team.name === request.team);
    if (!team || !record.sources?.some(source => /^https:\/\//.test(source))) throw new Error(`Missing team or sources: ${request.name}`);
    const id = 'expanded-player-' + createHash('sha256').update(normalizePlayerName(request.name)).digest('hex').slice(0, 16);
    const [firstName, ...lastName] = request.name.split(' ');
    const sourceSlug = record.sources.find(source => source.includes('eliteprospects.com/player/'))?.split('?')[0].split('/').pop();
    const photoSlug = request.name === 'Максим Тарасов' ? 'maksim-tarasov' : sourceSlug;
    const photoUrl = photoSlug && existsSync(`player-photo/${photoSlug}.png`) ? `./player-photo/${photoSlug}.png` : './player-photo/default.png';
    const currentKhlGames = record.stats?.league === 'KHL' ? Number(record.stats.games) || 0 : 0;
    const player = { id, team: team.name, status: record.status || 'active', firstName, lastName: lastName.join(' '), birthDate: record.birthDate,
      positions, nationality: record.nationality, photoUrl, attributes: this.#attributes.createAttributes(record),
      potential: record.potential, seasonsPlayed: record.khlCareer?.seasons ?? (currentKhlGames > 0 ? 1 : 0),
      khlGamesPlayed: record.khlCareer?.games ?? currentKhlGames, firstContractSeason: '2026/2027',
      careerCountsComplete: record.khlCareer?.games != null && record.khlCareer?.seasons != null };
    return { player, contract: this.#contracts.createContractRecord(record, id, team.shortName), research: record };
  }
}
