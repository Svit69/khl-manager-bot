import { LoanMovementReporter } from "./LoanMovementReporter.js";
import { LoanReasonPresenter } from "./LoanReasonPresenter.js";

export class LoanExecution {
  static execute(runtime, proposal) {
    const context = runtime.context;
    const fromTeam = context.teams.find(team => team.id === proposal.fromTeamId);
    const toTeam = context.teams.find(team => team.id === proposal.toTeamId);
    const player = fromTeam?.getRoster().find(row => row.id === proposal.playerId);
    const approval = runtime.evaluate(player, fromTeam, toTeam, context);
    if (!approval.eligible) return { accepted: false, message: approval.reasons.join(" ") };
    const result = runtime.service.start({ player, fromTeam, toTeam, season: context.seasonLabel, currentDate: context.currentDate, consent: true }, context);
    if (result.ok) LoanMovementReporter.record(context, result.agreement);
    return { ...result, accepted: result.ok, message: result.ok ? "Арендное соглашение заключено. Игрок добавлен в запас принимающего клуба."
      : LoanReasonPresenter.describe(result.reasons).join(" ") };
  }
}
