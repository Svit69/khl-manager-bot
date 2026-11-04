export class LoanUiController {
  sourceTeamId = ""; playerId = ""; borrowingTeamId = ""; message = "";
  view(state) {
    const view = state.getLoanView();
    const teams = view.teams || [], candidates = view.candidates || [];
    if (!teams.some((team) => team.id === this.sourceTeamId)) {
      this.sourceTeamId = candidates.find(player => player.destinations.some(row => row.eligible))?.ownerTeamId || teams[0]?.id || "";
    }
    const players = candidates.filter((player) => player.ownerTeamId === this.sourceTeamId);
    if (!players.some((player) => player.playerId === this.playerId)) this.playerId = players[0]?.playerId || "";
    const player = players.find((entry) => entry.playerId === this.playerId);
    const destinations = (player?.destinations || []).filter((entry) => this.sourceTeamId === view.activeTeamId || entry.teamId === view.activeTeamId);
    if (!destinations.some((entry) => entry.teamId === this.borrowingTeamId)) this.borrowingTeamId = destinations.find((entry) => entry.eligible)?.teamId || destinations[0]?.teamId || "";
    return { ...view, sourceTeamId: this.sourceTeamId, playerId: this.playerId, borrowingTeamId: this.borrowingTeamId, players, player, destinations, message: this.message };
  }
  change(action, value) {
    const fields = { "loan-source": "sourceTeamId", "loan-player": "playerId", "loan-borrower": "borrowingTeamId" };
    if (!fields[action]) return false;
    this[fields[action]] = value;
    if (action === "loan-source") { this.playerId = ""; this.borrowingTeamId = ""; }
    this.message = "";
    return true;
  }
  async act(action, id, state, userStore) {
    if (!["loan-submit", "loan-accept", "loan-reject", "loan-terminate"].includes(action)) return false;
    if (action === "loan-terminate" && !window.confirm("Завершить аренду и вернуть игрока в клуб-владелец?")) return true;
    try {
      const result = await (action === "loan-submit" ? state.submitLoanProposal({ playerId: this.playerId, borrowingTeamId: this.borrowingTeamId })
        : action === "loan-terminate" ? state.terminateLoanAgreement(id) : state.resolveLoanProposal(id, action === "loan-accept"));
      this.message = result?.message || (result?.accepted === false || result?.success === false || result?.ok === false ? "Операция недоступна. Обновите выбор игрока и клуба." : "Решение по аренде сохранено.");
      userStore.saveState(state.exportState());
    } catch { this.message = "Не удалось сохранить решение по аренде. Попробуйте ещё раз."; }
    return true;
  }
}
