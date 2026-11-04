import { LoanAgreement } from "./LoanAgreement.js";
import { LoanCalendar } from "./LoanCalendar.js";
import { LoanEligibility } from "./LoanEligibility.js";
import { LoanOperations } from "./LoanOperations.js";
import { LoanRegistry } from "./LoanRegistry.js";
import { LoanRosterTransfer } from "./LoanRosterTransfer.js";
export class LoanService extends LoanRegistry {
  evaluate(request, { contractService }) {
    const contracts = request.player?.id ? contractService.getContractsForPlayer(request.player.id) : [];
    const result = LoanEligibility.evaluate(request, contracts, this.exportRegistry());
    if (!LoanRosterTransfer.validate(request.player, request.fromTeam, request.toTeam)) {
      result.reasons.push("INVALID_ROSTER"); result.eligible = false;
    }
    return result;
  }
  start(request, context) {
    const eligibility = this.evaluate(request, context);
    if (!eligibility.eligible) return { ok: false, reasons: eligibility.reasons };
    return LoanOperations.commit(this, request, context, LoanOperations.create(request, context, eligibility));
  }
  returnLoan(request, context) {
    const record = this.exportRegistry().find(row => row.id === request.agreementId);
    if (!record || record.status !== "active") return { ok: false, reasons: ["ACTIVE_AGREEMENT_REQUIRED"] };
    if (record.playerId !== request.player?.id || record.fromTeamId !== request.fromTeam?.id ||
        record.toTeamId !== request.toTeam?.id || request.player?.affiliation?.teamId !== record.toTeamId ||
        !LoanRosterTransfer.validate(request.player, request.toTeam, request.fromTeam)) {
      return { ok: false, reasons: ["INVALID_PARTICIPANTS"] };
    }
    const now = LoanCalendar.timestamp(request.currentDate);
    if (!Number.isFinite(now) || now < LoanCalendar.timestamp(record.startedAt)) return { ok: false, reasons: ["INVALID_DATE"] };
    const agreement = new LoanAgreement(record).returned(new Date(now).toISOString());
    return LoanOperations.commit(this, request, context, agreement, true);
  }
  getDueReturns(currentDate) {
    const now = LoanCalendar.timestamp(currentDate);
    return this.exportRegistry().filter(row => row.status === "active" &&
      now >= LoanCalendar.timestamp(`${LoanCalendar.seasonYear(row.season) + 1}-06-01`));
  }
}
