import { LoanCandidatePresenter } from "./LoanCandidatePresenter.js";
import { LoanAgreementPresenter } from "./LoanAgreementPresenter.js";

export class LoanViewBuilder {
  build(runtime) {
    const context = runtime.context, year = Number(context.seasonLabel.slice(0, 4));
    const rows = runtime.service.exportRegistry().filter(row => row.status === "active")
      .map(row => LoanAgreementPresenter.present(runtime, row, context));
    const proposals = runtime.proposals.exportProposals().filter(row => row.status === "pending" && row.season === context.seasonLabel &&
      new Date(context.currentDate).getTime() <= Date.parse(row.expiresAt) && [row.fromTeamId, row.toTeamId].includes(context.activeTeamId))
      .map(row => {
        const presented = LoanAgreementPresenter.present(runtime, row, context);
        const owner = context.teams.find(team => team.id === row.fromTeamId);
        const borrower = context.teams.find(team => team.id === row.toTeamId);
        const player = owner?.getRoster().find(item => item.id === row.playerId);
        const approval = runtime.evaluate(player, owner, borrower, context);
        return { ...presented, canAccept: approval.eligible, message: approval.reasons.join(" "), requiresUserApproval: true };
      });
    return { enabled: context.enabled, capEnabled: context.capEnabled, activeTeamId: context.activeTeamId, seasonLabel: context.seasonLabel,
      endDate: `${year + 1}-05-31`, returnDate: `${year + 1}-06-01`,
      teams: context.teams.map(team => ({ id: team.id, name: team.name, logoUrl: team.logoUrl })),
      candidates: context.enabled ? LoanCandidatePresenter.build(runtime, context) : [], incoming: rows.filter(row => row.toTeamId === context.activeTeamId),
      outgoing: rows.filter(row => row.fromTeamId === context.activeTeamId), proposals };
  }
}
