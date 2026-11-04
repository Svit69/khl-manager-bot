import assert from "node:assert/strict";
import test from "node:test";
import { LoanTestFixture } from "./LoanTestFixture.mjs";
test("persistence failure restores original arrays, affiliation, contracts, registry", () => {
  const fixture = new LoanTestFixture({ persistRegistry: () => { throw new Error("SAVE_FAILED"); } });
  const before = fixture.contractService.exportContracts(), line = fixture.fromTeam.lines[0].players;
  const result = fixture.start(); assert.deepEqual(result, { ok: false, reasons: ["SAVE_FAILED"] });
  assert.equal(fixture.fromTeam.lines[0].players, line); assert.equal(line[0], fixture.player);
  assert.equal(fixture.player.affiliation.teamId, "owner");
  assert.equal(fixture.player.affiliation.contractId, "current");
  assert.equal(fixture.toTeam.reservePlayers.length, 0);
  assert.deepEqual(fixture.contractService.exportContracts(), before);
  assert.deepEqual(fixture.service.exportRegistry(), []);
});
test("failed return restores borrower lineup and active agreement", () => {
  const fixture = new LoanTestFixture(), { agreement } = fixture.start();
  fixture.toTeam.lines[0].players[0] = fixture.toTeam.reservePlayers.pop();
  fixture.context.persistRegistry = () => { throw new Error("SAVE_FAILED"); };
  const before = fixture.contractService.exportContracts();
  assert.equal(fixture.returnLoan(agreement).ok, false);
  assert.equal(fixture.toTeam.lines[0].players[0], fixture.player);
  assert.equal(fixture.fromTeam.reservePlayers.length, 0);
  assert.equal(fixture.player.affiliation.teamId, "borrower");
  assert.deepEqual(fixture.contractService.exportContracts(), before);
  assert.equal(fixture.service.getActiveForPlayer("player").id, agreement.id);
});
test("throw after contract mutation rolls back; duplicate roster never mutates", () => {
  const fixture = new LoanTestFixture(), before = fixture.contractService.exportContracts();
  const original = fixture.contractService.reassignSeasonContract.bind(fixture.contractService);
  fixture.contractService.reassignSeasonContract = (...args) => { original(...args); throw new Error("FAILED"); };
  assert.equal(fixture.start().ok, false);
  assert.deepEqual(fixture.contractService.exportContracts(), before);
  fixture.fromTeam.reservePlayers.push(fixture.player);
  assert.ok(fixture.service.evaluate(fixture.request, fixture.context).reasons.includes("INVALID_ROSTER"));
});
