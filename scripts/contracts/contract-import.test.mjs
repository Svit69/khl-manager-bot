import assert from 'node:assert/strict';
import test from 'node:test';
import { createContractImportFixture } from './ContractImportTestFixture.mjs';
import { importedPlayerRecords } from '../../src/data/contractImport/players/index.js';
import { Goalie } from '../../src/models/Goalie.js';

const fixture = createContractImportFixture();
test('CSV players remain unique and appear in their requested teams or markets', () => {
  assert.equal(fixture.all.filter(player => !player.id.startsWith('expanded-player-')).length, fixture.rows.length);
  assert.equal(new Set(fixture.all.map(player => player.id)).size, fixture.all.length);
  for (const row of fixture.rows) {
    const player = fixture.all.find(player => row['ID игрока'] ? player.id === row['ID игрока'] : player.name === row['Игрок']);
    assert.ok(player, row['Игрок']);
    const entry = fixture.active.find(entry => entry.player.id === player.id);
    if (entry) assert.equal(entry.team.name, row['Команда / группа'], player.name);
    else if (row['Команда / группа'] === 'Свободные агенты') assert.ok(fixture.freeAgents.includes(player));
    else assert.ok(fixture.externalPlayers.includes(player));
  }
});
test('every active contract matches CSV salary, type, season and destination', () => {
  const types = { 'Односторонний': 'one-way', 'Двухсторонний': 'two-way', 'Трехсторонний': 'three-way' };
  for (const { player, team } of fixture.active.filter(entry => !entry.player.id.startsWith('expanded-player-'))) {
    const row = fixture.rows.find(row => row['ID игрока'] ? row['ID игрока'] === player.id : row['Игрок'] === player.name);
    for (const season of Object.keys(row).filter(key => /^\d{4}\/\d{4}$/.test(key))) {
      const contract = fixture.contracts.find(contract => contract.playerId === player.id && contract.season === season);
      const salary = Number(String(row[season]).replace(',', '.')) * 1e6;
      if (!(salary > 0)) { assert.equal(contract, undefined, `${player.name} ${season}`); continue; }
      assert.equal(contract?.salaryRub, salary, `${player.name} ${season}`);
      assert.equal(contract?.type, types[row['Тип контракта']], player.name);
      assert.equal(contract?.teamId, team.id, player.name);
    }
  }
});
test('43 imported players use valid attributes and the correct skater or goalie model', () => {
  assert.equal(importedPlayerRecords.length, 43);
  for (const record of importedPlayerRecords) {
    const player = fixture.all.find(player => player.id === record.id);
    assert.ok(Number.isFinite(player.ovr), player.name);
    assert.ok(player.ovr <= record.potential, player.name);
    assert.equal(player instanceof Goalie, record.positions[0] === 'ВРТ', player.name);
    assert.equal(Object.keys(player.attributes.attributesJson).length, 5);
    assert.ok(Object.values(player.attributes.attributesJson).every(value => Number.isInteger(value) && value >= 40 && value <= 99));
  }
});
