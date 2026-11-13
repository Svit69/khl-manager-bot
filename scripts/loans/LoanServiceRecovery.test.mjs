import test from "node:test";
import assert from "node:assert/strict";
import { LoanTestFixture } from "./LoanTestFixture.mjs";

test("mandatory return restores an absent historical contract without rewriting future salaries", () => {
  const fixture = new LoanTestFixture(), { agreement } = fixture.start();
  const future = fixture.contractService.getContractForSeason("player", "2027/2028");
  fixture.contractService.importContracts({ contracts: [{ ...future, salaryRub: 7000000 }], releasedPlayerIds: ["player"] });
  assert.equal(fixture.contractService.getContractForSeason("player", "2026/2027"), null);
  const result = fixture.service.returnLoan({ ...fixture.request, agreementId: agreement.id,
    currentDate: "2027-06-01", reconcile: true }, fixture.context);
  assert.equal(result.ok, true);
  assert.deepEqual(fixture.contractService.getContractForSeason("player", "2026/2027"), agreement.originalContract);
  assert.equal(fixture.contractService.getContractForSeason("player", "2027/2028").salaryRub, 7000000);
});
test("reconciliation cannot bypass an early return or steal a third club's player", () => {
  const fixture = new LoanTestFixture(), { agreement } = fixture.start();
  const request = { ...fixture.request, agreementId: agreement.id, reconcile: true };
  assert.deepEqual(fixture.service.returnLoan(request, fixture.context).reasons, ["INVALID_DATE"]);
  fixture.player.affiliation.teamId = "third-club";
  const before = fixture.contractService.exportContracts();
  const result = fixture.service.returnLoan({ ...request, currentDate: "2027-06-01" }, fixture.context);
  assert.deepEqual(result.reasons, ["CONFLICTING_LOAN_OWNER"]);
  assert.equal(fixture.player.affiliation.teamId, "third-club");
  assert.deepEqual(fixture.contractService.exportContracts(), before);
  assert.equal(fixture.service.getActiveForPlayer("player").id, agreement.id);
});
