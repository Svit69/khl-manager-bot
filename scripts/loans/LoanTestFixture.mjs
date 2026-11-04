import { Team } from "../../src/models/Team.js";
import { PlayerAffiliation } from "../../src/models/PlayerAffiliation.js";
import { ContractService } from "../../src/contracts/ContractService.js";
import { LoanService } from "../../src/loans/LoanService.js";
export class LoanTestFixture {
  constructor({ birthDate = "2004-01-01", persistRegistry } = {}) {
    this.player = { id: "player", identity: { birthDate }, affiliation: new PlayerAffiliation({
      playerId: "player", teamId: "owner", contractId: "current", acquiredDay: 7 }) };
    this.other = { id: "other" };
    this.fromTeam = new Team({ id: "owner" }, [{ players: [this.player, this.other, null] }], []);
    this.toTeam = new Team({ id: "borrower" }, [{ players: [null, this.other] }], []);
    this.contractService = new ContractService([2026, 2027].map((year, index) => ({
      id: index ? "future" : "current", playerId: "player", teamId: "owner",
      season: `${year}/${year + 1}`, salaryRub: 5000000, type: "one_way" })));
    this.context = { contractService: this.contractService, persistRegistry };
    this.service = new LoanService();
    this.request = { player: this.player, fromTeam: this.fromTeam, toTeam: this.toTeam,
      season: "2026/2027", currentDate: "2026-11-04", consent: true, feeRub: 0 };
  }
  start() { return this.service.start(this.request, this.context); }
  returnLoan(agreement, currentDate = "2027-06-01") {
    return this.service.returnLoan({ ...this.request, agreementId: agreement.id, currentDate }, this.context);
  }
  history(overrides = {}) {
    const { agreement } = this.start();
    this.returnLoan(agreement);
    return { ...agreement, status: "returned", returnedAt: "2027-01-01T00:00:00Z", ...overrides };
  }
}
