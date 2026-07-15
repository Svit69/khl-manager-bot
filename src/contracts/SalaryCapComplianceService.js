import { pickMultiSeasonSalaryCapCuts } from "./SalaryCapComplianceMath.js";

const salaryFor = (contracts, playerId, seasonLabel) =>
  (contracts || []).find((item) => item.playerId === playerId && item.season === seasonLabel)?.salaryRub || 0;

const releaseScore = (player, salaryRub) => {
  const ovr = Number(player?.ovr) || 60;
  const age = Number(player?.age) || 27;
  const salaryMillions = (Number(salaryRub) || 0) / 1000000;
  const corePenalty = ovr >= 82 ? 35 : ovr >= 78 ? 18 : 0;
  const agePenalty = age <= 23 ? 12 : age <= 25 ? 6 : 0;
  return salaryMillions * 1.7 - (ovr - 60) * 0.85 - corePenalty - agePenalty;
};

export class SalaryCapComplianceService {
  buildView(team, contracts, seasonLabel, capRub, selectedIds = new Set()) {
    const rows = (team?.getRoster?.() || []).map((player) => {
      const salaryRub = salaryFor(contracts, player.id, seasonLabel);
      return { player, salaryRub, selected: selectedIds.has(player.id), score: releaseScore(player, salaryRub) };
    }).sort((left, right) => (right.salaryRub - left.salaryRub) || (left.player.ovr - right.player.ovr));
    const payrollRub = rows.reduce((sum, row) => sum + row.salaryRub, 0);
    const releasedRub = rows.filter((row) => row.selected).reduce((sum, row) => sum + row.salaryRub, 0);
    return { rows, seasonLabel, capRub, payrollRub, projectedRub: payrollRub - releasedRub, overRub: Math.max(0, payrollRub - capRub), isCompliant: payrollRub - releasedRub <= capRub };
  }

  pickCuts(team, contracts, seasonLabel, capRub) {
    const view = this.buildView(team, contracts, seasonLabel, capRub);
    let projectedRub = view.payrollRub;
    const cuts = [];
    view.rows.sort((left, right) => right.score - left.score).forEach((row) => {
      if (projectedRub <= capRub) return;
      if ((team?.getRoster?.() || []).length - cuts.length <= 18) return;
      cuts.push(row.player.id);
      projectedRub -= row.salaryRub;
    });
    return cuts;
  }

  pickMultiSeasonCuts(team, contracts, seasonLabels, getCapRub) {
    return pickMultiSeasonSalaryCapCuts({
      team, contracts, seasonLabels, getCapRub,
      buildView: (targetTeam, rows, season, capRub, selectedIds) => this.buildView(targetTeam, rows, season, capRub, selectedIds),
    });
  }
}
