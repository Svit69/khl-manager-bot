import { LoanExecution } from "./LoanExecution.js";

export class LoanCommands {
  static submit(runtime, { playerId, borrowingTeamId }) {
    const context = runtime.context;
    const owner = context.teams.find(team => team.getRoster().some(player => player.id === playerId));
    if (!context.enabled || !context.activeTeamId || ![owner?.id, borrowingTeamId].includes(context.activeTeamId))
      return { accepted: false, message: "Аренда недоступна для этого клуба." };
    if (runtime.proposals.hasPending(playerId)) return { accepted: false, message: "По игроку уже рассматривается предложение." };
    return LoanExecution.execute(runtime, { playerId, fromTeamId: owner?.id, toTeamId: borrowingTeamId });
  }
  static resolve(runtime, id, accepted) {
    const context = runtime.context;
    runtime.proposals.expire(context.currentDate, context.seasonLabel);
    const proposal = runtime.proposals.exportProposals().find(row => row.id === id && row.status === "pending");
    if (!proposal || !context.enabled || ![proposal.fromTeamId, proposal.toTeamId].includes(context.activeTeamId))
      return { accepted: false, message: "Предложение уже недоступно." };
    const result = accepted ? LoanExecution.execute(runtime, proposal) : { accepted: true, message: "Предложение аренды отклонено." };
    runtime.proposals.resolve(id, accepted ? result.accepted ? "accepted" : "failed" : "declined");
    return result;
  }
}
