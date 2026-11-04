import { advanceAiLoanSchedule } from './AiLoanSchedule.js';
import { buildAiLoanCandidates } from './AiLoanCandidates.js';

// Pure planning only. Persist planState atomically with a proposal/execution outcome.
// salaryOf must return the actual current-season annual contract salary (no proration).
// canLoan must validate eligibility and both AI clubs' consent, excluding user consent.
// It must check borrower full-season cap/current affordability and owner's CURRENT
// unchanged salary obligations plus FUTURE returning-player payroll and depth reserve.
// Keep the same salary when reassigning the current contract; preserve future owner.
// LoanService must revalidate at execution/acceptance; this is not an authorization.
export class AiLoanPlanner {
  plan(options) {
    const { state, checkpoint } = advanceAiLoanSchedule(options);
    const candidate = checkpoint ? buildAiLoanCandidates(options, state, checkpoint)[0] || null : null;
    if (candidate) state.proposedPlayerIds.push(candidate.playerId);
    return { candidate, planState: state };
  }
}
