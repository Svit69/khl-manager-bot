import { LoanCalendar } from "./LoanCalendar.js";
export class LoanAgreement {
  constructor(record) {
    const year = LoanCalendar.seasonYear(record?.season);
    if (!record?.id || !record.playerId || !record.fromTeamId || !record.toTeamId ||
        record.fromTeamId === record.toTeamId || !Number.isFinite(year) ||
        !["active", "returned"].includes(record.status) || !Number.isInteger(record.age) ||
        record.age < 0 || record.age > 24 || !record.originalContract?.id ||
        record.originalContract.teamId !== record.fromTeamId ||
        record.endDate !== LoanCalendar.endDate(year) ||
        !Number.isFinite(LoanCalendar.timestamp(record.startedAt))) throw new Error("INVALID_AGREEMENT");
    Object.assign(this, structuredClone(record));
    Object.freeze(this.originalContract);
    Object.freeze(this);
  }
  toJSON() { return structuredClone({ ...this }); }
  returned(currentDate) {
    return new LoanAgreement({ ...this.toJSON(), status: "returned", returnedAt: currentDate });
  }
}
