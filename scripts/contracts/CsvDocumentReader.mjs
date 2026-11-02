import { execFileSync } from 'node:child_process';

export class CsvDocumentReader {
  readRows(filePath, delimiter = ',') {
    const command = '[Console]::OutputEncoding=[System.Text.UTF8Encoding]::new(); '
      + '$rows=@(Import-Csv -LiteralPath $env:KHL_CONTRACT_INPUT -Delimiter $env:KHL_CONTRACT_DELIMITER -Encoding UTF8); '
      + 'ConvertTo-Json -InputObject $rows -Depth 5 -Compress';
    return JSON.parse(execFileSync('powershell.exe', ['-NoProfile', '-Command', command], {
      encoding: 'utf8', maxBuffer: 5 * 1024 * 1024,
      env: { ...process.env, KHL_CONTRACT_INPUT: filePath, KHL_CONTRACT_DELIMITER: delimiter },
    }));
  }
}
