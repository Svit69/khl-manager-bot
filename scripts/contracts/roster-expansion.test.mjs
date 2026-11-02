import assert from 'node:assert/strict';
import test from 'node:test';
import { createContractImportFixture } from './ContractImportTestFixture.mjs';
import { requestedRosterPlayers } from '../../src/data/rosterExpansion/RequestedRosterPlayers.js';
import { rosterExpansionPlayers } from '../../src/data/rosterExpansion/players/index.js';
import { rosterExpansionContracts } from '../../src/data/rosterExpansion/contracts/index.js';
import { Goalie } from '../../src/models/Goalie.js';

const fixture = createContractImportFixture();
const normalizeName = name => name.toLowerCase().replaceAll('ё', 'е');
test('all 106 requested players occur exactly once and have the requested club or recorded free agency', () => {
  assert.equal(rosterExpansionPlayers.length, requestedRosterPlayers.length);
  assert.equal(new Set(fixture.all.map(player => player.id)).size, fixture.all.length);
  for (const request of requestedRosterPlayers) {
    const matches = fixture.all.filter(player => normalizeName(player.name) === normalizeName(request.name));
    assert.equal(matches.length, 1, request.name);
    const record = rosterExpansionPlayers.find(record => record.id === matches[0].id);
    if (record.status === 'freeAgent') assert.ok(fixture.freeAgents.includes(matches[0]), request.name);
    else assert.equal(fixture.active.find(entry => entry.player.id === record.id)?.team.name, request.team, request.name);
  }
});
test('new players have valid position-specific attributes, identity, potential and linked contracts', () => {
  for (const record of rosterExpansionPlayers) {
    const player = fixture.all.find(player => player.id === record.id);
    assert.equal(player instanceof Goalie, record.positions[0] === 'ВРТ', player.name);
    assert.ok(Number.isFinite(player.ovr) && player.ovr >= 40 && player.ovr <= record.potential, player.name);
    assert.equal(player.identity.nationality.length, 2);
    assert.ok(!Number.isNaN(Date.parse(player.identity.birthDate)));
    assert.equal(Object.keys(player.attributes.attributesJson).length, 5);
    const contracts = fixture.contracts.filter(contract => contract.playerId === record.id);
    if (record.status === 'freeAgent') { assert.equal(contracts.length, 0); continue; }
    assert.ok(contracts.length > 0 && contracts.every(contract => contract.salaryRub > 0 && contract.teamId === player.affiliation.teamId));
    assert.ok(contracts.some(contract => contract.id === player.affiliation.contractId), player.name);
  }
});
test('reported salaries preserve Bailey correction and Zamula annual escalation', () => {
  const salaryRows = name => rosterExpansionContracts.find(record => record.playerId === rosterExpansionPlayers.find(player => `${player.firstName} ${player.lastName}` === name).id);
  assert.deepEqual(salaryRows('Егор Замула').salaries, [['2026/2027', 55], ['2027/2028', 60], ['2028/2029', 65]]);
  assert.deepEqual(salaryRows('Джастин Бэйли').salaries, [['2026/2027', 60]]);
  assert.equal(salaryRows('Джастин Бэйли').salaryStatus, 'reported');
  assert.equal(salaryRows('Вадим Жеренко').contractUntilConfirmed, false);
  assert.ok(rosterExpansionContracts.every(record => record.sources.length && ['estimated', 'reported', 'confirmed'].includes(record.salaryStatus)));
});
