const getPlayerScore = (player, salaryRub) => {
  const ovr = Number(player?.ovr) || 58;
  const salaryMillions = (Number(salaryRub) || 0) / 1000000;
  const corePenalty = ovr >= 82 ? 34 : ovr >= 78 ? 18 : ovr >= 74 ? 6 : 0;
  return salaryMillions * 1.9 - (ovr - 58) * 0.9 - corePenalty;
};

export class AiSalaryCapCompliancePlanner {
  pickContractPayrollCuts({ team, contracts, players, seasonLabels, getCapRub }) {
    const playerById = new Map((players || []).map((player) => [player.id, player]));
    const rosterIds = new Set((team?.getRoster?.() || []).map((player) => player.id));
    const selectedIds = new Set();
    (seasonLabels || []).forEach((seasonLabel) => {
      const capRub = getCapRub(seasonLabel);
      let payrollRub = this.#sumPayroll(contracts, team.id, seasonLabel, selectedIds);
      const candidates = this.#buildCutCandidates({ team, contracts, playerById, rosterIds, selectedIds, seasonLabel });
      while (payrollRub > capRub && candidates.length) {
        const candidate = candidates.shift();
        if (rosterIds.has(candidate.playerId) && rosterIds.size - selectedIds.size <= 18) continue;
        selectedIds.add(candidate.playerId);
        payrollRub -= candidate.salaryRub;
      }
    });
    return [...selectedIds];
  }

  #buildCutCandidates({ team, contracts, playerById, rosterIds, selectedIds, seasonLabel }) {
    return (contracts || [])
      .filter((contract) => contract.teamId === team.id && contract.season === seasonLabel && !selectedIds.has(contract.playerId))
      .map((contract) => ({
        playerId: contract.playerId,
        salaryRub: Number(contract.salaryRub) || 0,
        isRosterPlayer: rosterIds.has(contract.playerId),
        score: getPlayerScore(playerById.get(contract.playerId), contract.salaryRub),
      }))
      .sort((left, right) => Number(left.isRosterPlayer) - Number(right.isRosterPlayer) || right.score - left.score);
  }

  #sumPayroll(contracts, teamId, seasonLabel, ignoredIds) {
    return (contracts || [])
      .filter((contract) => contract.teamId === teamId && contract.season === seasonLabel && !ignoredIds.has(contract.playerId))
      .reduce((sum, contract) => sum + (Number(contract.salaryRub) || 0), 0);
  }
}
