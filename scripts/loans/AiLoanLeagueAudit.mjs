import { leagueFixture } from './AiLoanLeagueFixture.mjs';
import { AiLoanPlanner } from '../../src/loans/AiLoanPlanner.js';
import { aiLoanCheckpoints, aiLoanHash } from '../../src/loans/AiLoanSchedule.js';
import { buildAiLoanCandidates } from '../../src/loans/AiLoanCandidates.js';
import { isAiLoanSurplus } from '../../src/loans/AiLoanRoles.js';
export const auditSeason = (seasonLabel, seed = 0) => {
  const { options, execute } = leagueFixture(seasonLabel);
  const planner = new AiLoanPlanner();
  const counts = { season: seasonLabel, seed, qualifyingPlayers: 0, qualifyingPairs: 0,
    eligiblePairs: 0, completed: 0, failed: 0, winter: 0 };
  options.currentDate = `${seasonLabel.slice(0, 4)}-06-20`;
  const state = { proposedPlayerIds: [] };
  const rolesOnly = buildAiLoanCandidates({ ...options, canLoan: () => true }, state, 'audit');
  counts.qualifyingPlayers = new Set(rolesOnly.map((row) => row.playerId)).size;
  counts.qualifyingPairs = rolesOnly.length;
  counts.surplusPlayers = options.teams.reduce((n, team) => n + team.getRoster()
    .filter((player) => isAiLoanSurplus(team, player, options.currentDate)).length, 0);
  const eligible = buildAiLoanCandidates(options, state, 'audit');
  counts.eligiblePairs = eligible.length;
  counts.eligiblePlayers = new Set(eligible.map((row) => row.playerId)).size;
  for (const checkpoint of aiLoanCheckpoints(seasonLabel)) {
    options.currentDate = checkpoint.date;
    if (seed) options.random = () => aiLoanHash(`${seed}:${checkpoint.date}:activity`) / 4294967296;
    const result = planner.plan(options);
    options.planState = result.planState;
    if (!result.candidate) continue;
    const outcome = execute(result.candidate);
    if (!outcome.ok) { counts.failed++; continue; }
    counts.completed++;
    if (checkpoint.chance < 0.1) counts.winter++;
  }
  return counts;
};
if (process.argv[1]?.endsWith('AiLoanLeagueAudit.mjs')) {
  for (const season of ['2025/2026', '2026/2027', '2027/2028'])
    console.log(JSON.stringify(auditSeason(season)));
}
