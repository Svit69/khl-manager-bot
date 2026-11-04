import { LoanService } from "./LoanService.js";
import { LoanApprovalPolicy } from "./LoanApprovalPolicy.js";
import { LoanProposalBook } from "./LoanProposalBook.js";
import { LoanCommands } from "./LoanCommands.js";
import { LoanSeasonLifecycle } from "./LoanSeasonLifecycle.js";
import { LoanViewBuilder } from "./LoanViewBuilder.js";
import { AiLoanRuntime } from "./AiLoanRuntime.js";

export class LoanRuntime {
  #contextProvider;
  #service = new LoanService();
  #approval = new LoanApprovalPolicy();
  #proposals = new LoanProposalBook();
  #ai = new AiLoanRuntime();
  constructor(contextProvider) { this.#contextProvider = contextProvider; }
  get context() { return this.#contextProvider(); }
  get service() { return this.#service; }
  get proposals() { return this.#proposals; }
  evaluate(player, owner, borrower, context = this.context) { return this.#approval.evaluate(this.#service, context, player, owner, borrower); }
  activeAgreement(playerId) { return this.#service.exportRegistry().find(row => row.playerId === playerId && row.status === "active") || null; }
  protectedPlayerIds() { return new Set(this.#service.exportRegistry().filter(row => row.status === "active").map(row => row.playerId)); }
  view() { return new LoanViewBuilder().build(this); }
  submit(request) { return LoanCommands.submit(this, request); }
  resolve(id, accepted) { return LoanCommands.resolve(this, id, accepted); }
  terminate(id) { return LoanSeasonLifecycle.terminate(this, id); }
  returnSeason(season) { return LoanSeasonLifecycle.returnSeason(this, season); }
  tick() { this.#ai.tick(this); }
  exportState() { return { agreements: this.#service.exportRegistry(), proposals: this.#proposals.exportProposals(), ai: this.#ai.exportState() }; }
  importState(payload = {}) {
    this.#service.importRegistry(payload.agreements || []);
    this.#proposals.importProposals(payload.proposals);
    this.#ai.importState(payload.ai);
  }
  reset() { this.importState({}); }
}
