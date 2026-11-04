import test from 'node:test';
import assert from 'node:assert/strict';
import { aiLoanCheckpoints, advanceAiLoanSchedule } from '../../src/loans/AiLoanSchedule.js';
const run = (extra = {}) => advanceAiLoanSchedule({ seasonLabel: '2026/2027',
  currentDate: '2026-06-20', random: () => 0, ...extra });
test('persisted checkpoints do not reroll on refresh or reload', () => {
  const first = run();
  assert.equal(first.checkpoint, '2026-06-20');
  const state = JSON.parse(JSON.stringify(first.state));
  assert.equal(run({ planState: state, random: () => { throw Error('reroll'); } }).checkpoint, null);
  assert.deepEqual(state, first.state);
});
test('failed opportunity also persists; new season resets state', () => {
  const first = run({ random: () => 0.99 });
  assert.equal(first.checkpoint, null);
  assert.equal(run({ planState: first.state }).checkpoint, null);
  assert.ok(run({ seasonLabel: '2027/2028', currentDate: '2027-06-20', planState: first.state }).checkpoint);
});
test('season rate is 5.55 opportunities, not a hard completed-loan quota', () => {
  const entries = aiLoanCheckpoints('2026/2027');
  assert.ok(Math.abs(entries.reduce((n, row) => n + row.chance, 0) - 5.55) < 0.0001);
  let planState, count = 0;
  for (const row of entries) {
    const result = run({ currentDate: row.date, planState });
    planState = result.state;
    count += Number(Boolean(result.checkpoint));
  }
  assert.equal(count, 12);
});
test('winter is rare, includes January 25 and excludes later dates', () => {
  assert.equal(run({ currentDate: '2027-01-25', random: () => 0.04 }).checkpoint, '2027-01-25');
  assert.equal(run({ currentDate: '2027-01-25', random: () => 0.06 }).checkpoint, null);
  assert.equal(run({ currentDate: '2027-01-26' }).checkpoint, null);
  assert.equal(run({ currentDate: 'invalid' }).checkpoint, null);
  assert.equal(run({ currentDate: '2026-06-19' }).checkpoint, null);
  assert.equal(run({ currentDate: '2026-07-10' }).checkpoint, null);
});
test('default randomness is stable across processes and independent of page visits', () => {
  assert.deepEqual(run({ random: undefined }), run({ random: undefined }));
});
test('career seeds vary schedules and JSON save/reload preserves every future decision', () => {
  const schedule = (seed, reload = false) => { let planState;
    return aiLoanCheckpoints('2026/2027').map(({ date: currentDate }) => {
      const saved = reload ? JSON.parse(JSON.stringify({ seed, planState })) : { seed, planState };
      const result = run({ ...saved, currentDate, random: undefined });
      planState = result.state; return result.checkpoint;
    }); };
  assert.deepEqual(schedule('career-a'), schedule('career-a', true));
  assert.notDeepEqual(schedule('career-a'), schedule('career-b'));
});
