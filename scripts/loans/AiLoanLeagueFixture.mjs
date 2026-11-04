import { createContractImportFixture } from '../contracts/ContractImportTestFixture.mjs';
import { ContractService } from '../../src/contracts/ContractService.js';
import { SalaryCapService } from '../../src/contracts/SalaryCapService.js';
import { LoanService } from '../../src/loans/LoanService.js';
import { LoanApprovalPolicy } from '../../src/loans/LoanApprovalPolicy.js';
import assert from 'node:assert/strict';
export const leagueFixture = (seasonLabel) => {
  const fixture = createContractImportFixture();
  const contractService = new ContractService(fixture.contracts);
  const service = new LoanService(), caps = new SalaryCapService();
  const approval = new LoanApprovalPolicy();
  const rows = () => contractService.exportContracts().contracts;
  const salaryOf = (player) => contractService.getContractForSeason(player.id, seasonLabel)?.salaryRub;
  const options = { teams: fixture.teams, seasonLabel, activeTeamId: 'no-user',
    agreements: [], pending: [], salaryOf };
  const context = () => ({ teams: options.teams, activeTeamId: options.activeTeamId, enabled: true,
    seasonLabel, currentDate: options.currentDate, currentDay: 0,
    phase: String(options.currentDate).slice(5, 7) < '09' && String(options.currentDate).slice(0, 4) ===
      seasonLabel.slice(0, 4) ? 'preseason' : 'regular', contractService,
    contracts: rows(), capEnabled: true, capFor: (season) => caps.getCapRub(season),
    recordMovement: () => {}, notify: () => {} });
  const request = (player, fromTeam, toTeam) => ({ player, fromTeam, toTeam,
    season: seasonLabel, currentDate: options.currentDate, consent: true });
  options.canLoan = (player, owner, borrower) =>
    approval.evaluate(service, context(), player, owner, borrower).eligible;
  const execute = (candidate) => {
    const owner = fixture.teams.find((team) => team.id === candidate.ownerTeamId);
    const borrower = fixture.teams.find((team) => team.id === candidate.borrowerTeamId);
    const player = owner.getRoster().find((entry) => entry.id === candidate.playerId);
    const decision = approval.evaluate(service, context(), player, owner, borrower);
    if (!decision.eligible) return { ok: false, reasons: decision.codes };
    const future = rows().filter((row) => row.playerId === player.id && row.season > seasonLabel);
    const result = service.start(request(player, owner, borrower), context());
    if (result.ok) {
      assert.equal(contractService.getContractForSeason(player.id, seasonLabel).salaryRub, candidate.salaryRub);
      assert.deepEqual(rows().filter((row) => row.playerId === player.id && row.season > seasonLabel), future);
    }
    options.agreements = service.exportRegistry();
    return result;
  };
  return { options, execute, contracts: rows() };
};
