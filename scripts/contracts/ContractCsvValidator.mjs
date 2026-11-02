export class ContractCsvValidator {
  validateRows(rows) {
    if (!rows.length) throw new Error('Contract CSV is empty');
    const required = ['Команда / группа', 'Игрок', 'Тип контракта', 'ID игрока'];
    for (const key of required) if (!(key in rows[0])) throw new Error(`Missing CSV column: ${key}`);
    const seasons = Object.keys(rows[0]).filter(key => /^\d{4}\/\d{4}$/.test(key));
    if (!seasons.length) throw new Error('Missing season columns');
    const ids = new Set();
    for (const row of rows) {
      const id = row['ID игрока'];
      if (id && ids.has(id)) throw new Error(`Duplicate player ID: ${id}`);
      if (id) ids.add(id);
      for (const season of seasons) {
        const value = String(row[season] || '').trim();
        const salary = Number(value.replace(',', '.'));
        if (value && (!Number.isFinite(salary) || salary < 0)) throw new Error(`Invalid salary: ${row['Игрок']} ${season}`);
      }
    }
    return seasons;
  }
}
