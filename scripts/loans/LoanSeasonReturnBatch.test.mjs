import test from "node:test";
import assert from "node:assert/strict";
import { LoanTestFixture } from "./LoanTestFixture.mjs";
import { LoanSeasonReturnBatch } from "../../src/loans/LoanSeasonReturnBatch.js";

test("a later failed return rolls back earlier returns, contracts and notifications; retry succeeds", () => {
  const fixture = new LoanTestFixture(), { agreement } = fixture.start();
  const movements = [], notifications = [];
  const context = { ...fixture.context, teams: [fixture.fromTeam, fixture.toTeam],
    recordMovement: row => movements.push(row), notify: row => notifications.push(row) };
  const runtime = { context, service: fixture.service };
  const before = fixture.contractService.exportContracts();
  const reserve = fixture.toTeam.reservePlayers;
  const pending = { ...agreement, id: "second-loan", playerId: "missing-player" };
  assert.throws(() => LoanSeasonReturnBatch.run(runtime, [agreement, pending], row => {
    if (row.id === pending.id) return { accepted: false, reasons: ["INVALID_PARTICIPANTS"] };
    return { ...fixture.returnLoan(row), accepted: true };
  }), /LOAN_RETURN_FAILED: missing-player: INVALID_PARTICIPANTS/);
  assert.equal(fixture.toTeam.reservePlayers, reserve);
  assert.deepEqual(reserve, [fixture.player]);
  assert.equal(fixture.player.affiliation.teamId, "borrower");
  assert.equal(fixture.player.affiliation.contractId, agreement.originalContract.id);
  assert.deepEqual(fixture.contractService.exportContracts(), before);
  assert.equal(fixture.service.getActiveForPlayer(fixture.player.id).id, agreement.id);
  assert.equal(movements.length, 0);
  assert.equal(notifications.length, 0);
  LoanSeasonReturnBatch.run(runtime, [agreement], row => ({ ...fixture.returnLoan(row), accepted: true }));
  assert.equal(fixture.player.affiliation.teamId, "owner");
  assert.equal(movements.length, 1);
  assert.equal(notifications.length, 1);
});

test("rollback does not resurrect seed contracts absent before the return", () => {
  const fixture = new LoanTestFixture(), { agreement } = fixture.start();
  const payload = fixture.contractService.exportContracts();
  payload.contracts = payload.contracts.filter(row => row.season !== agreement.season);
  fixture.contractService.importContracts(payload, { mergeBaseContracts: false });
  const before = fixture.contractService.exportContracts();
  const runtime = { service: fixture.service, context: { ...fixture.context, teams: [fixture.fromTeam, fixture.toTeam] } };
  assert.throws(() => LoanSeasonReturnBatch.run(runtime, [agreement], () => {
    fixture.contractService.restoreLoanSeasonContract(agreement.originalContract);
    return { accepted: false, reasons: ["SAVE_FAILED"] };
  }), /SAVE_FAILED/);
  assert.deepEqual(fixture.contractService.exportContracts(), before);
});
