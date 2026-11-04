export class LoanProposalBook {
  #rows = [];
  exportProposals() { return structuredClone(this.#rows); }
  importProposals(rows = []) {
    const ids = new Set();
    this.#rows = (Array.isArray(rows) ? rows : []).filter(row => {
      if (!row?.id || !row.playerId || !row.fromTeamId || !row.toTeamId || ids.has(row.id)) return false;
      ids.add(row.id);
      return ["pending", "accepted", "declined", "expired", "failed"].includes(row.status);
    }).map(row => ({ ...row }));
  }
  hasPending(playerId) { return this.#rows.some(row => row.playerId === playerId && row.status === "pending"); }
  add(proposal) { if (!this.hasPending(proposal.playerId)) this.#rows.push({ ...proposal, status: "pending" }); }
  resolve(id, status) { const row = this.#rows.find(item => item.id === id); if (row) row.status = status; }
  expire(currentDate, season) {
    const date = new Date(currentDate).getTime();
    this.#rows.forEach(row => {
      if (row.status === "pending" && (row.season !== season || date > Date.parse(row.expiresAt))) row.status = "expired";
    });
  }
}
