export class RosterExpansionAttributes {
  createAttributes(record) {
    const rating = record.overall;
    const position = record.positions[0];
    const offsets = position === 'ВРТ' ? [2, 0, 3, -4, -1]
      : position === 'ЗАЩ' ? [-4, 0, 4, 5, -5]
        : position === 'ЦТР' ? [0, 1, 1, 1, -3] : [3, 3, -2, -4, 0];
    if (position !== 'ВРТ' && Number.isFinite(record.stats?.goals) && Number.isFinite(record.stats?.assists)) {
      const scoringTilt = Math.sign(record.stats.goals - record.stats.assists) * 2;
      offsets[0] += scoringTilt;
      offsets[4] -= scoringTilt;
    }
    return offsets.map(offset => Math.max(40, Math.min(99, rating + offset)));
  }
}
