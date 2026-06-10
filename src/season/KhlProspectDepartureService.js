import { KhlNorthAmericaInterestService } from "./KhlNorthAmericaInterestService.js";

export class KhlProspectDepartureService {
  #interest = new KhlNorthAmericaInterestService();

  assess(player, context = {}) {
    return this.#interest.assess(player, context);
  }

  evaluate(player, context = {}) {
    const risk = this.assess(player, context);
    if (!risk?.shouldDepart) return null;
    return {
      league: risk.league,
      status: risk.status,
      contractUntil: risk.contractUntil,
      contractEndDate: risk.contractEndDate,
    };
  }
}
