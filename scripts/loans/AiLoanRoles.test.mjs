import test from 'node:test';
import assert from 'node:assert/strict';
import { fixture, P } from './AiLoanFixture.mjs';
import { isAiLoanSurplus, aiLoanRoleImprovement, aiLoanAge } from '../../src/loans/AiLoanRoles.js';
test('young surplus must gain a much better receiving role', () => {
  const { owner, borrower, player } = fixture();
  assert.ok(isAiLoanSurplus(owner, player, '2026-06-20'));
  assert.deepEqual(aiLoanRoleImprovement(owner, borrower, player), { donorRank: 5, receiverRank: 1 });
  borrower.getRoster().forEach((entry) => { entry.ovr = 75; });
  assert.equal(aiLoanRoleImprovement(owner, borrower, player), null);
});
test('core and over-24 players are protected', () => {
  const { owner, player } = fixture();
  owner.lines = [{ players: [player] }];
  assert.equal(isAiLoanSurplus(owner, player, '2026-06-20'), false);
  owner.lines = [];
  player.identity.birthDate = '2001-06-20';
  assert.equal(isAiLoanSurplus(owner, player, '2026-06-20'), false);
  assert.equal(aiLoanAge(player, '2026-06-19'), 24);
});
test('donor retains two goalies; third-to-backup is insufficient improvement', () => {
  const { owner, borrower, player } = fixture(P.G);
  assert.ok(isAiLoanSurplus(owner, player, '2026-06-20'));
  borrower.getRoster().find((entry) => entry.identity.primaryPosition === P.G).ovr = 75;
  assert.equal(aiLoanRoleImprovement(owner, borrower, player), null);
  owner.getRoster().splice(owner.getRoster().findIndex((entry) => entry.identity.primaryPosition === P.G), 1);
  assert.equal(isAiLoanSurplus(owner, player, '2026-06-20'), false);
});
test('both exact position and aggregate forward depth are protected', () => {
  const { owner, player } = fixture();
  owner.getRoster().splice(owner.getRoster().findIndex((entry) => entry.identity.primaryPosition === P.LW), 1);
  assert.equal(isAiLoanSurplus(owner, player, '2026-06-20'), false);
});
