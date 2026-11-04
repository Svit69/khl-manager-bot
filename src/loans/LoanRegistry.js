import { LoanAgreement } from "./LoanAgreement.js";
export class LoanRegistry {
  #records = [];
  exportRegistry() { return this.#records.map(row => row.toJSON()); }
  getActiveForPlayer(playerId) {
    return this.#records.find(row => row.playerId === playerId && row.status === "active")?.toJSON() || null;
  }
  importRegistry(rows) {
    if (!Array.isArray(rows)) throw new Error("INVALID_REGISTRY");
    const records = rows.map(row => new LoanAgreement(row)), ids = new Set(), players = new Set();
    for (const row of records) {
      if (ids.has(row.id) || (row.status === "active" && players.has(row.playerId))) throw new Error("DUPLICATE_AGREEMENT");
      ids.add(row.id);
      if (row.status === "active") players.add(row.playerId);
    }
    this.#records = records;
  }
}
