import { writeFile } from 'node:fs/promises';
import { ContractReportBuilder } from './contracts/ContractReportBuilder.mjs';

const report = new ContractReportBuilder().buildReport();
const escapeCsvCell = value => `"${String(value).replaceAll('"', '""')}"`;
const escapeMarkdownCell = value => String(value).replaceAll('|', '\\|').replaceAll('\n', ' ');
const csv = [report.headers, ...report.rows].map(row => row.map(escapeCsvCell).join(';')).join('\r\n');
const tableRows = [report.headers, report.headers.map(() => '---'), ...report.rows];
const markdown = '# Контракты всех игроков\n\nДанные текущей базы проекта после применения трансферов. Зарплаты указаны в миллионах рублей за сезон. Пустая ячейка означает отсутствие контракта КХЛ на сезон. Внешние контракты и права указаны отдельно; исторические зарплаты свободных агентов не включены.\n\n'
  + tableRows.map(row => `| ${row.map(escapeMarkdownCell).join(' | ')} |`).join('\n') + '\n';
await writeFile(new URL('../reports/all-player-contracts.csv', import.meta.url), '\uFEFF' + csv, 'utf8');
await writeFile(new URL('../reports/all-player-contracts.md', import.meta.url), markdown, 'utf8');
console.log(JSON.stringify({ players: report.rows.length, seasons: report.seasons, preview: report.rows.slice(0, 3) }));
