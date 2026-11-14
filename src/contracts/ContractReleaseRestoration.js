export class ContractReleaseRestoration {
  static restore(releasedIds, savedContracts, baseContracts) {
    const released = new Set(releasedIds);
    const baseIds = new Set(baseContracts.map(row => row.id));
    const savedById = new Map(savedContracts.map(row => [row.id, row]));
    const originals = new Map();
    for (const row of baseContracts) {
      const key = `${row.playerId}:${row.season}`;
      if (!originals.has(key)) originals.set(key, []);
      originals.get(key).push(row);
    }
    for (const row of savedContracts) {
      if (baseIds.has(row.id)) continue;
      const previous = originals.get(`${row.playerId}:${row.season}`) || [];
      if (previous.some(original => (savedById.get(original.id) || original).teamId !== row.teamId)) released.add(row.playerId);
    }
    return released;
  }
  static reconcileRows(rows, baseIds) {
    const latest = new Map();
    for (const row of rows) {
      if (!baseIds.has(row.id)) latest.set(`${row.playerId}:${row.season}`, row);
    }
    return rows.filter(row => {
      const replacement = latest.get(`${row.playerId}:${row.season}`);
      return !replacement || replacement === row;
    });
  }
}
