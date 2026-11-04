import test from 'node:test';
import assert from 'node:assert/strict';
import { fixture, P } from './AiLoanFixture.mjs';
import { aiLoanRoleImprovement } from '../../src/loans/AiLoanRoles.js';
test('fifth-choice forward may gain a regular third-line role, not a fourth-line role', () => {
  const { owner, borrower, player } = fixture();
  const peers = borrower.getRoster().filter((entry) => entry.identity.primaryPosition === P.CTR);
  peers.slice(0, 2).forEach((entry) => { entry.ovr = 80; });
  assert.deepEqual(aiLoanRoleImprovement(owner, borrower, player), { donorRank: 5, receiverRank: 3 });
  peers[2].ovr = 80;
  assert.equal(aiLoanRoleImprovement(owner, borrower, player), null);
});
test('fourth-choice goalie may gain a backup role, but not third-choice goalie', () => {
  const { owner, borrower, player } = fixture(P.G);
  const peer = { id: 'extra-goalie', ovr: 80, identity: { primaryPosition: P.G } };
  owner.getRoster().push(peer);
  borrower.getRoster().find((entry) => entry.identity.primaryPosition === P.G).ovr = 80;
  assert.deepEqual(aiLoanRoleImprovement(owner, borrower, player), { donorRank: 4, receiverRank: 2 });
});
test('eighth-choice defenseman may gain a top-six role, not a reserve role', () => {
  const { owner, borrower, player } = fixture(P.DEF);
  const peers = borrower.getRoster().filter((entry) => entry.identity.primaryPosition === P.DEF);
  peers.slice(0, 5).forEach((entry) => { entry.ovr = 80; });
  assert.deepEqual(aiLoanRoleImprovement(owner, borrower, player), { donorRank: 8, receiverRank: 6 });
  peers[5].ovr = 80;
  assert.equal(aiLoanRoleImprovement(owner, borrower, player), null);
});
