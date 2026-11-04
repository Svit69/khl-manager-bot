import test from 'node:test';
import assert from 'node:assert/strict';
import { AiLoanPlanner } from '../../src/loans/AiLoanPlanner.js';
import { fixture } from './AiLoanFixture.mjs';
const planner = new AiLoanPlanner();
test('pure planner returns unchanged annual salary and does not mutate inputs', () => {
  const { options, owner, player } = fixture();
  const roster = structuredClone(owner.getRoster());
  const result = planner.plan(options);
  assert.equal(result.candidate.playerId, player.id);
  assert.equal(result.candidate.salaryRub, 1000000);
  assert.deepEqual(owner.getRoster(), roster);
  assert.equal(options.planState, null);
  assert.equal(planner.plan({ ...options, planState: result.planState }).candidate, null);
});
test('user-club incoming and outgoing require approval, separate from player consent', () => {
  for (const activeTeamId of ['borrower', 'owner']) {
    const { options } = fixture();
    const { candidate } = planner.plan({ ...options, activeTeamId });
    assert.equal(candidate.requiresUserApproval, true);
    assert.equal(candidate.playerConsent, true);
    assert.equal(candidate.teamConsent[activeTeamId], null);
  }
});
test('active agreements, current-season history, pending and previous proposals block duplicates', () => {
  const { options, player } = fixture();
  for (const key of ['agreements', 'pending']) {
    assert.equal(planner.plan({ ...options, [key]: [{ playerId: player.id }] }).candidate, null);
  }
  const first = planner.plan(options);
  assert.equal(planner.plan({ ...options, currentDate: '2026-07-12', planState: first.planState }).candidate, null);
  assert.ok(planner.plan({ ...options, agreements: [{ playerId: player.id,
    season: '2025/2026', status: 'returned' }] }).candidate);
});
test('team input order cannot change deterministic selection', () => {
  const { options } = fixture();
  assert.deepEqual(planner.plan(options), planner.plan({ ...options, teams: [...options.teams].reverse() }));
});
test('no suitable players means no forced loan; junior-only players are ignored', () => {
  const { options, owner, player } = fixture();
  owner.juniorPlayers = [player];
  owner.getRoster().splice(owner.getRoster().indexOf(player), 1);
  assert.equal(planner.plan(options).candidate, null);
});
