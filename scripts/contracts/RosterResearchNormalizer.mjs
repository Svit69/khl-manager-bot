const positionsByLabel = { C: 'ЦТР', LW: 'ЛНП', RW: 'ПНП', D: 'ЗАЩ', G: 'ВРТ' };
const countryCodes = { RUS: 'RU', BLR: 'BY', KAZ: 'KZ', USA: 'US', CAN: 'CA', CZE: 'CZ' };
const normalizeSeason = value => {
  if (!value) return null;
  const match = /^(\d{4})\/(\d{2}|\d{4})$/.exec(value);
  return match ? `${match[1]}/${Number(match[1]) + 1}` : value;
};
export const normalizeRosterResearch = record => {
  const notes = typeof record.notes === 'object' && record.notes !== null ? Object.values(record.notes).join(' ') : record.notes || '';
  const savePercentage = record.stats?.savePercentage ?? record.stats?.savePct;
  const salaries = record.salaryBySeason && Object.fromEntries(Object.entries(record.salaryBySeason).map(([season, value]) => [normalizeSeason(season), value]));
  const nationality = Array.isArray(record.nationality) ? record.nationality[0] : record.nationality;
  return { ...record,
    positions: (record.positions || []).filter(position => position !== 'F').map(position => positionsByLabel[position] || position),
    nationality: countryCodes[nationality] || nationality,
    contractUntil: normalizeSeason(record.contractUntil), salaryBySeason: salaries,
    loanUntil: normalizeSeason(record.loanUntil),
    stats: record.stats ? { ...record.stats, season: normalizeSeason(record.stats.season),
      gaa: record.stats.gaa ?? record.stats.GAA ?? null,
      savePercentage: savePercentage == null ? null : Number((savePercentage <= 1 ? savePercentage * 100 : savePercentage).toFixed(2)) } : null,
    notes,
  };
};
