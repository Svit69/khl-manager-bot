import { aiLoanHash } from './AiLoanSchedule.js';
import { isAiLoanSurplus, aiLoanRoleImprovement } from './AiLoanRoles.js';

export const buildAiLoanCandidates = (options, state, checkpoint) => {
  const { teams = [], activeTeamId, seasonLabel, currentDate, salaryOf, canLoan } = options;
  if (typeof salaryOf !== 'function' || typeof canLoan !== 'function') return [];
  const blocked = new Set(state.proposedPlayerIds);
  for (const record of [...(options.agreements || []), ...(options.pending || [])]) {
    if (record?.playerId == null) continue;
    if (record.status === 'active' || !(record.season || record.seasonLabel) ||
      (record.season || record.seasonLabel) === seasonLabel) blocked.add(record.playerId);
  }
  const candidates = [];
  for (const owner of teams) for (const player of owner.getRoster()) {
    if (blocked.has(player.id) || !isAiLoanSurplus(owner, player, currentDate)) continue;
    const salaryRub = salaryOf(player);
    if (!Number.isFinite(salaryRub) || salaryRub <= 0) continue;
    for (const borrower of teams) {
      if (borrower.id === owner.id || borrower.getRoster().some((entry) => entry.id === player.id)) continue;
      const roles = aiLoanRoleImprovement(owner, borrower, player);
      if (!roles || canLoan(player, owner, borrower) !== true) continue;
      const requiresUserApproval = [owner.id, borrower.id].includes(activeTeamId);
      candidates.push({
        id: `ai-loan-${seasonLabel}-${checkpoint}-${owner.id}-${borrower.id}-${player.id}`,
        playerId: player.id, ownerTeamId: owner.id, borrowerTeamId: borrower.id,
        seasonLabel, salaryRub, requiresUserApproval, ...roles,
        teamConsent: { owner: owner.id === activeTeamId ? null : true,
          borrower: borrower.id === activeTeamId ? null : true },
        playerConsent: true,
      });
    }
  }
  const key = (entry) => aiLoanHash(`${seasonLabel}:${checkpoint}:${entry.id}`);
  return candidates.sort((left, right) => key(left) - key(right) || left.id.localeCompare(right.id));
};
