import test from 'node:test';
import assert from 'node:assert/strict';
import { AiLoanPlanner } from '../../src/loans/AiLoanPlanner.js';
import { fixture } from './AiLoanFixture.mjs';
const planner = new AiLoanPlanner();
test('missing salary or consent/budget callback fails closed', () => {
  const { options } = fixture();
  for (const salaryOf of [undefined, () => NaN, () => 0, () => -1])
    assert.equal(planner.plan({ ...options, salaryOf }).candidate, null);
  for (const canLoan of [undefined, () => false, () => ({ eligible: true })])
    assert.equal(planner.plan({ ...options, canLoan }).candidate, null);
});
test('runtime veto protects current borrower affordability and future owner reserve', () => {
  const { options, player, owner, borrower } = fixture();
  const salaryOf = () => 100000000;
  const reserveRub = 500000;
  for (const [currentRoom, futureRoom] of [[50000000, 1000000], [101000000, 400000]]) {
    let checks = 0;
    const canLoan = (p, from, to) => {
      checks++;
      assert.equal(p, player); assert.equal(from, owner); assert.equal(to, borrower);
      return currentRoom - salaryOf(p) >= reserveRub && futureRoom >= reserveRub;
    };
    assert.equal(planner.plan({ ...options, salaryOf, canLoan }).candidate, null);
    assert.equal(checks, 1);
  }
  assert.equal(planner.plan({ ...options, salaryOf }).candidate.salaryRub, 100000000);
});
