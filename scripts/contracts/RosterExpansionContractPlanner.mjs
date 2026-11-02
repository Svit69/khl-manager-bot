export class RosterExpansionContractPlanner {
  createContractRecord(record, playerId, teamShortName) {
    const firstSeason = '2026/2027';
    const endYear = Number(String(record.contractUntil || firstSeason).slice(0, 4));
    if (!Number.isInteger(endYear) || endYear < 2026 || endYear > 2033) throw new Error(`Invalid contract end: ${record.name}`);
    const salaries = [];
    for (let year = 2026; record.status !== 'freeAgent' && year <= endYear; year++) {
      const season = `${year}/${year + 1}`;
      const salary = record.salaryBySeason?.[season] ?? record.salaryMillions;
      if (!Number.isFinite(salary) || salary <= 0) throw new Error(`Missing salary assessment: ${record.name} ${season}`);
      salaries.push([season, salary]);
    }
    const age = 2026 - Number(record.birthDate.slice(0, 4));
    const type = record.contractType || (age < 24 && record.overall < 72 ? 'two-way' : 'one-way');
    if (!['one-way', 'two-way', 'three-way'].includes(type)) throw new Error(`Invalid contract type: ${record.name}`);
    return { playerId, team: record.status === 'freeAgent' ? null : teamShortName, type, salaries,
      contractUntilConfirmed: Boolean(record.contractUntil && record.contractUntilConfirmed !== false),
      salaryStatus: record.salaryStatus || (record.salaryConfirmed ? 'confirmed' : 'estimated'),
      contractTypeStatus: record.contractTypeStatus || 'estimated',
      sources: record.sources, notes: record.notes || '' };
  }
}
