import assert from 'node:assert/strict';
import test from 'node:test';
import { auditSeason } from './AiLoanLeagueAudit.mjs';
test('real new-season rosters sustain about five-six executed league loans without a quota', () => {
  const seasons = Array.from({ length: 12 }, (_, index) => auditSeason('2026/2027', index + 1));
  const mean = seasons.reduce((sum, row) => sum + row.completed, 0) / seasons.length;
  console.log(JSON.stringify({ simulation: '2026/2027', seeds: seasons.length, mean,
    completed: seasons.map((row) => row.completed), qualifyingPlayers: seasons[0].qualifyingPlayers,
    eligiblePlayers: seasons[0].eligiblePlayers, eligiblePairs: seasons[0].eligiblePairs }));
  assert.ok(mean >= 4.5 && mean <= 6.5, `mean=${mean}`);
  assert.ok(seasons[0].eligiblePlayers >= 6);
  assert.ok(seasons.every((row) => row.failed === 0));
  assert.ok(seasons.some((row) => row.completed > 6), 'six must not become a hard quota');
  assert.ok(seasons.reduce((sum, row) => sum + row.winter, 0) <= 4);
});
test('real original and later unrenewed snapshots stay eligible and never force missing loans', () => {
  for (const season of ['2025/2026', '2027/2028']) {
    const result = auditSeason(season);
    console.log(JSON.stringify(result));
    assert.equal(result.failed, 0);
    assert.ok(result.completed <= 12);
    assert.ok(result.eligiblePlayers > 0);
  }
});
