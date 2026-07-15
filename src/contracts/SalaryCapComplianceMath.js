export const pickMultiSeasonSalaryCapCuts = ({ team, contracts, seasonLabels, getCapRub, buildView }) => {
  const selectedIds = new Set();
  (seasonLabels || []).forEach((seasonLabel) => {
    const capRub = getCapRub(seasonLabel);
    let rows = buildView(team, contracts, seasonLabel, capRub, selectedIds).rows
      .filter((row) => !selectedIds.has(row.player.id) && row.salaryRub > 0)
      .sort((left, right) => right.score - left.score);
    let payrollRub = buildView(team, contracts, seasonLabel, capRub, selectedIds).projectedRub;
    while (payrollRub > capRub && rows.length) {
      if ((team?.getRoster?.() || []).length - selectedIds.size <= 18) break;
      const row = rows.shift();
      selectedIds.add(row.player.id);
      payrollRub -= row.salaryRub;
    }
  });
  return [...selectedIds];
};
